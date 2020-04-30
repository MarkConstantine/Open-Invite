"use strict";
const SessionManager = require("./session-manager.js");
const { MessageEmbed } = require("discord.js");
const Logger = require("./logger.js")(module);
const Session = require("./session.js");

/** Class to handle/parse any valid commands for this bot. */
class CommandHandler {
  static COMMANDS = {
    HELP:         "!help",
    START:        "!start",
    END:          "!end",
    CANCEL:       "!cancel",
    ADD:          "!add",
    REMOVE:       "!remove",
    RESIZE:       "!resize",
    RENAME:       "!rename",
    ADVERTISE:    "!advertise",
    COINFLIP:     "!coinflip"
  };

  static HELP_MESSAGE = [
    {
      name: `Print available commands`,
      value: `${CommandHandler.COMMANDS.HELP}`,
    },
    {
      name: `Starting a Session`,
      value: `${CommandHandler.COMMANDS.START} [NUMBER_OF_USERS] "TITLE"`,
    },
    {
      name: `Ending your Session (deactivates the session but keeps it in the chat)`,
      value: `${CommandHandler.COMMANDS.END}`
    },
    {
      name: `Cancelling your session (removes the session from the chat)`,
      value: `${CommandHandler.COMMANDS.CANCEL}`,
    },
    {
      name: `Adding users to your session (users could also join by reacting with ${Session.joinButton})`,
      value: `${CommandHandler.COMMANDS.ADD} @username @username ...`,
    },
    {
      name: `Removing users from your session (users could also leave by reacting with ${Session.leaveButton})`,
      value: `${CommandHandler.COMMANDS.REMOVE} @username @username ...`,
    },
    {
      name: `Changing the number of slots for your session`,
      value: `${CommandHandler.COMMANDS.RESIZE} [NUMBER_OF_USERS]`,
    },
    {
      name: `Renaming your session's title`,
      value: `${CommandHandler.COMMANDS.RENAME} "NEW TITLE"`,
    },
    {
      name: `Advertise your session (repost your session so it's at the bottom of the chat)`,
      value: `${CommandHandler.COMMANDS.ADVERTISE}`,
    },
    {
      name: `Flip a coin (for settling disbutes)`,
      value: `${CommandHandler.COMMANDS.COINFLIP}`,
    },
  ];

  /**
   * Determine if the received message is a command for this bot.
   * @param {Message} message The message that the user sent.
   */
  handle(message) {
    const command = message.content;
    const host = message.author;

    if (command.startsWith(CommandHandler.COMMANDS.HELP))
      this.handleHelpCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.START))
      this.handleStartCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.END))
      this.handleEndCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.CANCEL))
      this.handleCancelCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.ADD))
      this.handleAddCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.REMOVE))
      this.handleRemoveCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.RESIZE))
      this.handleResizeCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.RENAME))
      this.handleRenameCommand(message, command, host);

      if (command.startsWith(CommandHandler.COMMANDS.ADVERTISE))
      this.handleAdvertiseCommand(message, command, host);

    if (command.startsWith(CommandHandler.COMMANDS.COINFLIP))
      this.handleCoinFlipCommand(message, command, host);

    // Do nothing if command not recognized.
  }

  /**
   * Print a help message for the user containing all the available commands.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleHelpCommand(message, command, host) {
    Logger.info(`Help from ${host.tag}: ${command}`);
    const helpEmbed = new MessageEmbed()
      .setColor(0xffffff)
      .setTitle("Game-Queue Help")
      .addFields(CommandHandler.HELP_MESSAGE);
    message.reply(helpEmbed);
  }

  /**
   * Parse the start command and send the information to the SessionManager to create
   * a session for the user.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleStartCommand(message, command, host) {
    Logger.info(`Start from ${host.tag}: ${command}`);
    const matchesInteger = command.match(/\d+/g);
    let userCount = undefined;
    if (matchesInteger !== null)
      userCount = parseInt(matchesInteger[0]); // Choosing first int as number of users.

    const matchesTitle = command.match(/"(.*?)"/);
    let title = undefined;
    if (matchesTitle !== null && matchesTitle[1] !== "")
      title = matchesTitle[1];

    SessionManager.startSession(message, host, title, userCount);
  }

  /**
   * Inform the SessionManager that the user wishes to end their session.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleEndCommand(message, command, host) {
    Logger.info(`End from ${host.tag}: ${command}`);
    SessionManager.endSession(message, host);
  }

  /**
   * Inform the SessionManager that the user wishes to cancel (i.e. delete) their session.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleCancelCommand(message, command, host) {
    Logger.info(`Cancel from ${host.tag}: ${command}`);
    SessionManager.cancelSession(message, host);
  }

  /**
   * Parse the add command and send the information to the SessionManager to add
   * any number of users to the caller's session.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleAddCommand(message, command, host) {
    Logger.info(`Add from ${host.tag}: ${command}`);
    const split = command.split(" ");
    const usernamesToAddList = [];

    for (let i = 1; i < split.length; i++) {
      const trimmed = split[i].trim();
      if (trimmed !== "") {
        usernamesToAddList.push(trimmed);
      }
    }

    SessionManager.addUsersToSession(message, host, usernamesToAddList);
  }

  /**
   * Parse the remove command and send the information to the SessionManager to remove
   * any number of users from the caller's session.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleRemoveCommand(message, command, host) {
    Logger.info(`Remove from ${host.tag}: ${command}`);
    const split = command.split(" ");
    const usernamesToRemoveList = [];

    for (let i = 1; i < split.length; i++) {
      const trimmed = split[i].trim();
      if (trimmed !== "") {
        usernamesToRemoveList.push(trimmed);
      }
    }

    SessionManager.removeUsersFromSession(message, host, usernamesToRemoveList);
  }

  /**
   * Parse the resize command and send the information to the SessionManager to resize
   * the user count of the caller's session.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleResizeCommand(message, command, host) {
    Logger.info(`Resize from ${host.tag}: ${command}`);
    const split = command.split(" ");
    const newUserCount = parseInt(split[1]);
    SessionManager.resizeSession(message, host, newUserCount);
  }

  /**
   * Parse the rename command and send the information to the SessionManager to rename
   * the title of the caller's session.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleRenameCommand(message, command, host) {
    Logger.info(`Rename from ${host.tag}: ${command}`);
    const matchesTitle = command.match(/"(.*?)"/);
    let newTitle = undefined;
    if (matchesTitle !== null && matchesTitle[1] !== "")
      newTitle = matchesTitle[1];
    SessionManager.renameSession(message, host, newTitle);
  }

  /**
   * Inform the SessionManager that the user wishes to advertise their session.
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command. 
   */
  handleAdvertiseCommand(message, command, host) {
    Logger.info(`Advertise from ${host.tag}: ${command}`);
    SessionManager.advertiseSession(message, host);
  }

  /**
   * Flip a coin (for settling disbutes).
   * @param {Message} message The message that the user sent.
   * @param {string} command The original command that the user sent. 
   * @param {User} host The sender of the command.
   */
  handleCoinFlipCommand(message, command, host) {
    const result = (Math.floor(Math.random() * 2) == 0) ? "Heads" : "Tails" ;
    Logger.info(`Coinflip ${result} from ${host.tag}: ${command}`);
    message.reply(result);
  }
}

module.exports = new CommandHandler();
