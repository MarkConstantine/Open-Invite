"use strict";

require("dotenv").config();
const DiscordBot = require("./src/discord-bot.js");
const CommandHandler = require("./src/command-handler.js");
const SessionManager = require("./src/session-manager.js");

class GameQueue {
  constructor() {
    this.botName = "Game-Queue";
    this.discordBot = new DiscordBot("Game-Queue");
    this.sessionManager = new SessionManager(this.discordBot);
    this.commandHandler = new CommandHandler(this.sessionManager);

    this.discordBot.on("message", (message) => {
      this.commandHandler.handle(message);
    });

    this.discordBot.on("messageReactionAdd", (reaction, user) => {
      if (user.username === this.botName) return;
      this.sessionManager.handleReactionButtons(reaction, user);
    });
  }

  start(token) {
    this.discordBot.login(token);
  }
}

const gameQueue = new GameQueue();
gameQueue.start(process.env.TOKEN);

