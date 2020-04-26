"use strict";
const SessionManager = require("./session-manager.js");
const { MessageEmbed } = require("discord.js");

class CommandHandler {
  static COMMANDS = {
    HELP:   "!help",
    START:  "!start",
    ADD:    "!add",
    REMOVE: "!remove",
    END:    "!end",
    RESIZE: "!resize",
  };

  static HELP_MESSAGE = [
    { name: "Starting a Session"        , value: `${CommandHandler.COMMANDS.START} [NUMBER_OF_PLAYERS] "TITLE"` },
    { name: "Adding Players"            , value: `${CommandHandler.COMMANDS.ADD} @username @username ...` },
    { name: "Removing Players"          , value: `${CommandHandler.COMMANDS.REMOVE} @username @username ...` },
    { name: "Ending a Session"          , value: `${CommandHandler.COMMANDS.END}` },
    { name: "Change Number of Players"  , value: `${CommandHandler.COMMANDS.RESIZE} [NUMBER_OF_PLAYERS]`},
  ];

  handle(message) {
    const command = message.content;
    const host = message.author;
    
    if (command.startsWith(CommandHandler.COMMANDS.HELP))
      this.handleHelpCommand(message);

    if (command.startsWith(CommandHandler.COMMANDS.START))
      this.handleStartCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.ADD))
      this.handleAddCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.REMOVE))
      this.handleRemoveCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.END))
      this.handleEndCommand(message, command, host);
    
    if (command.startsWith(CommandHandler.COMMANDS.RESIZE))
      this.handleResizeCommand(message, command, host);

    // Do nothing if command not recognized.
  }

  handleHelpCommand(message) {
    const helpEmbed = new MessageEmbed()
      .setColor(0xFFFFFF)
      .setTitle("Game-Queue Help")
      .addFields(CommandHandler.HELP_MESSAGE);

    message.reply(helpEmbed);
  }

  handleStartCommand(message, command, host) {
    const matchesInteger = command.match(/\d+/g);
    let playerCount = undefined;
    if (matchesInteger !== null)
      playerCount = parseInt(matchesInteger[0]); // Choosing first int as number of players.

    const matchesTitle = command.match(/"(.*?)"/);
    let title = undefined;
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

module.exports = new CommandHandler();
