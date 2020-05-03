"use strict";
const Logger = require("./logger.js")(module);
const { MessageEmbed } = require("discord.js");

/** Class representing an active session message. */
class Session {
  static joinButton = "👍";
  static leaveButton = "✋";

  /**
   * Create a new Session on the text channel provided by the message parameter.
   * @param {Message} message The command message used to create this session.
   * @param {User} host The user that is hosting this session. 
   * @param {number} userCount The number of users that can connect to this session.
   * @param {string} title The title of the session.
   */
  constructor(message, host, userCount, title) {
    this.message = message;
    this.host = host;
    this.title = title;
    this.users = new Array(userCount).fill(undefined);
    this.connected = 0;
    this.embedColor = Math.floor(Math.random() * 0xFFFFFF);
    this.startTime = new Date();
    this.sendEmbedMessage();
  }

  /**
   * Update the existing Discord embed message to indicate that 
   * the Session has ended.
   */
  end() {
    Logger.info(`${this.end.name}, host=${this.host.tag}`);
    this.embedMessage.edit(this.createEmbed(true));

    const joinButtonReaction = this.embedMessage.reactions.cache.get(Session.joinButton);
    if (joinButtonReaction !== undefined) {
      joinButtonReaction.remove()
        .then(() => Logger.info(`${this.end.name}, host=${this.host.tag}. Join button deleted.`))
        .catch(error => Logger.error(`${this.end.name}, host=${this.host.tag}. Failed to remove joinButton: ${error}`));
    }

    const leaveButtonReaction = this.embedMessage.reactions.cache.get(Session.leaveButton);
    if (leaveButtonReaction !== undefined) {
      leaveButtonReaction.remove()
        .then(() => Logger.info(`${this.end.name}, host=${this.host.tag}. Leave button deleted.`))
        .catch(error => Logger.error(`Failed to remove leaveButton: ${error}`));
    }
  }

  /**
   * Cancel the session by deleting the embed message.
   */
  cancel() {
    Logger.info(`${this.cancel.name}, host=${this.host.tag}`);
    this.embedMessage.delete();
  }

  /**
   * Adds a list of Discord users to the session.
   * @param {Users[]} usersToAdd List of users to add to the session.
   * @returns {Users[]} A list of users that were not added to the session
   */
  addUsers(usersToAdd) {
    const usersNotAdded = [];    

    for (const user of usersToAdd) {
      const openSlotIndex = this.users.indexOf(undefined);
      if (openSlotIndex === -1) {
        Logger.error(`${this.addUsers.name}, Session is full. Could not add ${user.tag}(ID=${user.id})`);
        usersNotAdded.push(user);
      }
      else if (this.isUserConnected(user)) {
        Logger.error(`${this.addUsers.name}, ${user.tag}(ID=${user.id}) is already connected.`);
        usersNotAdded.push(user);
      }
      else {
        Logger.info(`${this.addUsers.name}, host=${this.host.tag}. Adding ${user.tag}(ID=${user.id}) at index ${openSlotIndex}`);
        this.users[openSlotIndex] = user;
        this.connected += 1;
      }
    }
    
    this.update();
    return usersNotAdded;
  }

  /**
   * Removes a list of Discord users from the session.
   * @param {Users[]} usersToRemove List of users to remove from the session. 
   * @returns {Users[]} A list of users that were not removed from the session.
   */
  removeUsers(usersToRemove) {
    const usersNotRemoved = [];

    for (const removeUser of usersToRemove) {
      const userIndex = this.users.findIndex((user) => user !== undefined && user.id === removeUser.id);
      if (userIndex === -1) {
        Logger.error(`${this.removeUsers.name}, host=${this.host.tag}, ${removeUser.tag} is not connected`);
        usersNotRemoved.push(removeUser); // Could not remove.
      } 
      else {
        Logger.info(`${this.removeUsers.name}, host=${this.host.tag}, removeUser=${this.users[userIndex].tag}(ID=${this.users[userIndex].id})`);
        this.users[userIndex] = undefined;
        this.connected -= 1;
      }
    }

    this.update();
    return usersNotRemoved;
  }

  /**
   * Resize the amount of users that can join the session.
   * Keeps the already connected users in the session.
   * @param {number} newUserCount The new desired size of the session.
   * @returns {boolean} Returns false if there's more connected users than the desired size. True otherwise.
   */
  resize(newUserCount) {
    if (newUserCount < this.connected) {
      Logger.error(`${this.resize.name}, host=${this.host.tag}. Cannot resize to ${newUserCount}. There's ${this.connected} connected user(s).`);
      return false;
    }
    
    let newArray = new Array(newUserCount).fill(undefined);
    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      if (user !== undefined) {
        newArray[i] = user;
      }
    }
    this.users = newArray;
    this.update();
    return true;
  }

  /**
   * Change the title of the session.
   * @param {string} newTitle The new title to replace the existing title.
   */
  rename(newTitle) {
    Logger.info(`${this.rename.name}, host=${this.host.tag}, old=${this.title}, new=${newTitle}`);
    this.title = newTitle;
    this.update();
  }

  /**
   * Determine if the session has the following user connected.
   * @param {User} userToSearch The user to search for.
   * @returns {boolean} True if the user is connected to the session. False otherwise.
   */
  isUserConnected(userToSearch) {
    const result = this.users.findIndex((user) => user !== undefined && user.id === userToSearch.id) !== -1;
    Logger.info(`${this.isUserConnected.name}, host=${this.host.tag}, userToSearch=${userToSearch}, result=${result}`);
    return result;
  }

  /**
   * Returns the field string of all connected users in the session.
   * @param {boolean} isEnded Set to true to generate the field string for an ended session. False otherwise.
   * @returns {string} A string of connected users to go into the MessageEmbed.
   */
  constructFieldString(isEnded = false) {
    let fieldString = "";
    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      const newLine = (i === this.users.length - 1) ? "" : "\n"; // Don't newline the last element.
      if (isEnded) {
        fieldString += `${i + 1}. ${user === undefined ? "CLOSED SLOT" : user}${newLine}`;
      } else {
        fieldString += `${i + 1}. ${user === undefined ? "OPEN SLOT" : user}${newLine}`;
      }
    }
    Logger.info(`${this.constructFieldString.name}, host=${this.host.tag}, fieldString=\n${fieldString}`);
    return fieldString;
  }

  /**
   * Create the MessageEmbed to be sent to Discord.
   * @param {boolean} isEnded Set to true if the session has ended. False otherwise.
   * @returns {MessageEmbed} The MessageEmbed to be sent to Discord.
   */
  createEmbed(isEnded = false) {
    Logger.info(`${this.createEmbed.name}, host=${this.host.tag}, isEnded=${isEnded}`);
    if (isEnded) {
      return new MessageEmbed()
        .setColor(this.embedColor)
        .setTitle(this.title)
        .setThumbnail(this.host.displayAvatarURL())
        .addField("Host", `<@${this.host.id}>`)
        .addFields(
          { name: "Playing", value: this.constructFieldString(isEnded) }
        )
        .setTimestamp()
        .setFooter("SESSION ENDED");
    } else {
      return new MessageEmbed()
        .setColor(this.embedColor)
        .setTitle(this.title)
        .setThumbnail(this.host.displayAvatarURL())
        .addField("Host", `<@${this.host.id}>`)
        .addFields(
          { name: "Playing", value: this.constructFieldString(isEnded) }
        )
        .setTimestamp(this.startTime)
        .setFooter(`${Session.joinButton} to join. ${Session.leaveButton} to leave.`);
    }
  }

  /**
   * Send the session's info as an Embed Message.
   */
  sendEmbedMessage() {
    // Create a new embed message on discord.
    this.message.channel.send(this.createEmbed())
      .then(embedMessage => {
        Logger.info(`${this.sendEmbedMessage.name}, host=${this.host.tag}. New MessageEmbed with ID=${embedMessage.id}`);
        // Save the message response to update later.
        this.embedMessage = embedMessage;
        
        // Create the join button.
        this.embedMessage.react(Session.joinButton);

        // Create the leave button.
        this.embedMessage.react(Session.leaveButton);
      })
      .catch(error => Logger.error(`${this.sendEmbedMessage.name}, ${error}`));
  }

  /**
   * Updates the session info by deleting the old embed and
   * creating a new embed message.
   */
  update() {    
    Logger.info(`${this.update.name}, host=${this.host.tag}`);
    if (this.embedMessage !== undefined) {
      Logger.info(`${this.update.name}, Deleting old MessageEmbed with ID=${this.embedMessage.id}`);
      this.embedMessage.delete();
    }
    this.sendEmbedMessage();
  }
}

module.exports = Session;
