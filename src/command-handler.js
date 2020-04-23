"use strict";
const SessionManager = require("./session-manager.js");
const { MessageEmbed } = require("discord.js");

// Instantiate only once.
class _CommandHandler {
  constructor() {
    this.COMMANDS = {
      HELP:   "!help",
      START:  "!start",
      ADD:    "!add",
      REMOVE: "!remove",
      END:    "!end",
      RESIZE: "!resize",
    };

    this.help = [
      { name: "Starting a Session"        , value: `${this.COMMANDS.START} [NUMBER_OF_PLAYERS] "TITLE"` },
      { name: "Adding Players"            , value: `${this.COMMANDS.ADD} [@USERNAME_1] [@USERNAME_2] ... [@USERNAME_N]` },
      { name: "Removing Players"          , value: `${this.COMMANDS.REMOVE} [@USERNAME_1] [@USERNAME_2] ... [@USERNAME_N]` },
      { name: "Ending a Session"          , value: `${this.COMMANDS.END}` },
      { name: "Change Number of Players"  , value: `${this.COMMANDS.RESIZE} [NUMBER_OF_PLAYERS]`}
    ];

    this.defaultPlayerCount = 4;
    this.defaultTitle = "Gaming Sesh";
  }

  handle(message) {
    const command = message.content;
    const host = message.author;
    
    if (command.startsWith(this.COMMANDS.HELP))
      this.handleHelpCommand(message);

    if (command.startsWith(this.COMMANDS.START))
      this.handleStartCommand(message, command, host);

    if (command.startsWith(this.COMMANDS.ADD))
      this.handleAddCommand(message, command, host);

    if (command.startsWith(this.COMMANDS.REMOVE))
      this.handleRemoveCommand(message, command, host);

    if (command.startsWith(this.COMMANDS.END))
      this.handleEndCommand(message, command, host);
    
    if (command.startsWith(this.COMMANDS.RESIZE))
      this.handleResizeCommand(message, command, host);

    // Do nothing if command not recognized.
  }

  handleHelpCommand(message) {
    const helpEmbed = new MessageEmbed()
      .setColor(0xFFFFFF)
      .setTitle("Game-Queue Help")
      .addFields(this.help)

    message.reply(helpEmbed);
  }

  handleStartCommand(message, command, host) {
    const matchesInteger = command.match(/\d+/g);
    let playerCount = this.defaultPlayerCount;
    if (matchesInteger !== null)
      playerCount = parseInt(matchesInteger[0]); // Choosing first int as number of players.

    const matchesTitle = command.match(/"(.*?)"/);
    let title = this.defaultTitle;
    if (matchesTitle !== null && matchesTitle[1] !== "")
      title = matchesTitle[1];

    SessionManager.startSession(message, host, title, playerCount);
  }

  handleAddCommand(message, command, host) {
    const split = command.split(" ");
    const playerUsernamesToAddList = [];

    for (let i = 1; i < split.length; i++) {
      const trimmed = split[i].trim();
      if (trimmed !== "") {
        playerUsernamesToAddList.push(trimmed);
      }
    }
    
    SessionManager.addPlayersToSession(message, host, playerUsernamesToAddList);
  }

  handleRemoveCommand(message, command, host) {
    const split = command.split(" ");
    const playerUsernamesToRemoveList = [];

    for (let i = 1; i < split.length; i++) {
      const trimmed = split[i].trim();
      if (trimmed !== "") {
        playerUsernamesToRemoveList.push(trimmed);
      }
    }

    SessionManager.removePlayersFromSession(message, host, playerUsernamesToRemoveList);
  }

  handleEndCommand(message, command, host) {
    SessionManager.endSession(message, host);
  }

  handleResizeCommand(message, command, host) {
    const split = command.split(" ");
    const newPlayerCount = parseInt(split[1]);
    SessionManager.resizeSession(message, host, newPlayerCount);
  }
}

const CommandHandler = new _CommandHandler();
module.exports = CommandHandler;
