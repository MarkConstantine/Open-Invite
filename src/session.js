"use strict";
const { MessageEmbed } = require("discord.js");

class Session {
  static joinButton = "👍";
  static leaveButton = "✋";

  /**
   * Create a new Session on the text channel provided by the message parameter.
   * @param {Message} message The command message used to create this session.
   * @param {User} host The user that is hosting this session. 
   * @param {number} playerCount The number of players that can connect to this session.
   * @param {string} title The title of the session.
   */
  constructor(message, host, playerCount, title) {
    this.message = message;
    this.host = host;
    this.title = title;
    this.players = new Array(playerCount).fill(undefined);
    this.connected = 0;
    this.embedColor = Math.floor(Math.random() * 0xFFFFFF);

    this.updateEmbedMessage();
  }

  /**
   * Determine if the session has the following user connected.
   * @param {User} player The user to search for.
   * @returns {boolean} True if the user is connected to the session. False otherwise.
   */
  isUserConnected(player) {
    return this.players.findIndex((user) => user !== undefined && user.id === player.id) !== -1;
  }

  /**
   * Resize the amount of players that can join the session.
   * Keeps the already connected players in the session.
   * @param {number} newPlayerCount The new desired size of the session.
   * @returns {boolean} Returns false if there's more connected players than the desired size. True otherwise.
   */
  resizePlayerCount(newPlayerCount) {
    if (newPlayerCount < this.connected) return false;
    
    let newPlayersArray = new Array(newPlayerCount).fill(undefined);
    for (let i = 0; i < this.players.length; i++) {
      const user = this.players[i];
      if (user !== undefined) {
        newPlayersArray[i] = user;
      }
    }
    this.players = newPlayersArray;
    this.updateEmbedMessage();
    return true;
  }

  /**
   * Adds a list of Discord users to the session.
   * @param {Array} playerList List of users to add to the session.
   * @returns {Array} A list of players that were not added to the session
   */
  addPlayers(playerList) {
    const playersNotAddedList = [];    

    for (const player of playerList) {
      const openSlotIndex = this.players.indexOf(undefined);
      if (openSlotIndex === -1 || this.isUserConnected(player)) {
        playersNotAddedList.push(player); // Could not add.
      }
      else {
        this.players[openSlotIndex] = player;
        this.connected += 1;
      }
    }
    
    this.updateEmbedMessage();
    return playersNotAddedList;
  }

  /**
   * Removes a list of Discord users from the session.
   * @param {Array} playerList List of users to remove from the session. 
   * @returns {Array} A list of players that were not removed from the session.
   */
  removePlayers(playerList) {
    const playersNotRemovedList = [];

    for (const player of playerList) {
      const playerIndex = this.players.findIndex((user) => user !== undefined && user.id === player.id);
      if (playerIndex === -1) {
        playersNotRemovedList.push(player); // Could not remove.
      } 
      else {
        this.players[playerIndex] = undefined;
        this.connected -= 1;
      }
    }

    this.updateEmbedMessage();
    return playersNotRemovedList;
  }

  /**
   * Returns the field string of all connected players in the session.
   * @param {boolean} isEnded Set to true to generate the field string for an ended session. False otherwise.
   * @returns {string} A string of connected players to the session to go into the MessageEmbed.
   */
  constructFieldString(isEnded = false) {
    let fieldString = "";
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (isEnded) {
        fieldString += `${i + 1}. ${player === undefined ? "CLOSED SLOT" : player}\n`;
      } else {
        fieldString += `${i + 1}. ${player === undefined ? "OPEN SLOT" : player}\n`;
      }
    }
    return fieldString;
  }

  /**
   * Create the MessageEmbed to be sent to Discord.
   * @param {boolean} isEnded Set to true if the session has ended. False otherwise.
   * @returns {MessageEmbed} The MessageEmbed to be sent to Discord.
   */
  createEmbed(isEnded = false) {
    if (isEnded) {
      return new MessageEmbed()
        .setColor(this.embedColor)
        .setTitle(this.title)
        .setThumbnail(this.host.displayAvatarURL())
        .addFields(
          { name: "Host", value: `<@${this.host.id}>` },
          { name: "Playing", value: this.constructFieldString(isEnded) }
        )
        .setTimestamp()
        .setFooter("SESSION ENDED");
    } else {
      return new MessageEmbed()
        .setColor(this.embedColor)
        .setTitle(this.title)
        .setThumbnail(this.host.displayAvatarURL())
        .addFields(
          { name: "Host", value: `<@${this.host.id}>` },
          { name: "Playing", value: this.constructFieldString(isEnded) }
        )
        .setTimestamp()
        .setFooter(`${Session.joinButton} to join. ${Session.leaveButton} to leave.`);
    }
  }

  /**
   * Updates the session info by deleting the old embed and
   * creating a new embed message.
   */
  updateEmbedMessage() {    
    if (this.embedMessage !== undefined) {
      this.embedMessage.delete();
    }
    
    // Create a new embed message on discord.
    this.message.channel.send(this.createEmbed()).then((embedMessage) => {
      // Save the message response to update later.
      this.embedMessage = embedMessage;
      
      // Create the join button.
      this.embedMessage.react(Session.joinButton);

      // Create the leave button.
      this.embedMessage.react(Session.leaveButton);
    });
  }

  /**
   * Update the existing Discord embed message to indicate that the Session has ended.
   */
  endSession() {
    this.embedMessage.edit(this.createEmbed(true));
  }
}

module.exports = Session;
