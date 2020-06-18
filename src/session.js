"use strict";
const Logger = require("./logger.js")(module);
const { MessageEmbed } = require("discord.js");

function shuffleArray(array) {
  for(let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

/** Class representing an active session message. */
class Session {
  static joinButton = "👍";
  static leaveButton = "✋";

  static STATES = {
    ACTIVE:         "ACTIVE",
    ENDED:          "ENDED",
    TEAMS_ACTIVE:   "TEAMS_ACTIVE",
    TEAMS_ENDED:    "TEAMS_ENDED",
  };

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
    this.state = Session.STATES.ACTIVE;
    this.numberOfTeams = 2;
    this.teamSize = Math.floor(userCount / this.numberOfTeams);
    this.sendEmbedMessage();
  }

  /**
   * Update the existing Discord embed message to indicate that 
   * the Session has ended.
   */
  end() {
    Logger.info(`${this.end.name}, host=${this.host.tag}`);
    this.state = (this.state === Session.STATES.TEAMS_ACTIVE) ? Session.STATES.TEAMS_ENDED : Session.STATES.ENDED;
    this.embedMessage.edit(this.createEmbed(this.state));

    // Remove the join button.
    const joinButtonReaction = this.embedMessage.reactions.cache.get(Session.joinButton);
    if (joinButtonReaction !== undefined) {
      joinButtonReaction.remove()
        .then(() => Logger.info(`${this.end.name}, host=${this.host.tag}. Join button deleted.`))
        .catch(error => Logger.error(`${this.end.name}, host=${this.host.tag}. Failed to remove joinButton: ${error}`));
    }

    // Remove the leave button.
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
   * Randomly assign your session's users into the specified number of teams.
   * @param {number} numberOfTeams The specified number of teams.
   */
  randomizeTeams(numberOfTeams) {
    this.state = Session.STATES.TEAMS_ACTIVE;
    this.numberOfTeams = numberOfTeams;
    this.teamSize = Math.floor(this.users.length / this.numberOfTeams);
    shuffleArray(this.users);
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
   * @param {Session.STATES} sessionState State of the session to display.
   * @param {number} teamSize Number of users to stop at for this field string.
   * @param {number} userStartIndex The starting index when looping through the users array.
   * @returns {string} A string of connected users to go into the MessageEmbed.
   */
  constructFieldString(sessionState = Session.STATES.ACTIVE, teamSize = this.users.length, userStartIndex = 0) {
    let fieldString = "";
    for (let i = userStartIndex; i < userStartIndex + teamSize; i++) {
      const user = this.users[i];
      const closedOrOpen = (sessionState === Session.STATES.ENDED || sessionState === Session.STATES.TEAMS_ENDED) ? "CLOSED SLOT" : "OPEN SLOT";
      const newLine = (i === this.users.length - 1) ? "" : "\n"; // Don't newline the last element.
      fieldString += `${i + 1}. ${user === undefined ? closedOrOpen : user}${newLine}`;
    }
    Logger.info(`${this.constructFieldString.name}, host=${this.host.tag}, fieldString=\n${fieldString}, teamSize=${teamSize}, userStartIndex=${userStartIndex}`);
    return fieldString;
  }

  /**
   * Create the body of the session for the message embed.
   * @param {Session.STATES} sessionState State of the session to display.
   */
  constructSessionBody(sessionState = Session.STATES.ACTIVE) {
    const fields = [];
    
    switch (sessionState) {
      case Session.STATES.ACTIVE:
      case Session.STATES.ENDED:
        fields.push({
          name: "Connected",
          value: this.constructFieldString(sessionState)
        });
        return fields;
      case Session.STATES.TEAMS_ACTIVE:
      case Session.STATES.TEAMS_ENDED:
        for (let i = 0; i < this.numberOfTeams; i++) {
          fields.push({
            name: `Team ${i + 1}`,
            value: this.constructFieldString(sessionState, this.teamSize, i * this.teamSize)
          });
        }
        return fields;
      default:
        Logger.error(`${this.createEmbed.name}, host=${this.host.tag}, Unknown sessionState=${sessionState}`);
    }
  }

  /**
   * Create the MessageEmbed to be sent to Discord.
   * @param {Session.STATES} sessionState State of the session to display.
   * @returns {MessageEmbed} The MessageEmbed to be sent to Discord.
   */
  createEmbed(sessionState = Session.STATES.ACTIVE) {
    Logger.info(`${this.createEmbed.name}, host=${this.host.tag}, sessionState=${sessionState}`);
    
    const embed = new MessageEmbed()
      .setColor(this.embedColor)
      .setTitle(this.title)
      .setThumbnail(this.host.displayAvatarURL())
      .addField("Host", `<@${this.host.id}>`)
      .addFields(this.constructSessionBody(sessionState));
    
    switch (sessionState) {
      case Session.STATES.ACTIVE:
      case Session.STATES.TEAMS_ACTIVE:
        embed.setFooter(`${Session.joinButton} to join. ${Session.leaveButton} to leave.`);
        embed.setTimestamp(this.startTime);
        break;
      case Session.STATES.ENDED:
      case Session.STATES.TEAMS_ENDED:
        embed.setFooter("SESSION ENDED");
        embed.setTimestamp();
        break;
      default:
        Logger.error(`${this.createEmbed.name}, host=${this.host.tag}, Unknown sessionState=${sessionState}`);
    }

    return embed;
  }

  /**
   * Send the session's info as an Embed Message.
   */
  sendEmbedMessage() {
    // Create a new embed message on discord.
    this.message.channel.send(this.createEmbed(this.state))
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
