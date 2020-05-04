"use strict";

require("dotenv").config();
const DiscordBot = require("./discord-bot.js");
const CommandHandler = require("./command-handler.js");
const SessionManager = require("./session-manager.js");

class OpenInvite {
  constructor() {
    this.botName = "Open-Invite";
    this.discordBot = new DiscordBot();
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

const bot = new OpenInvite();
bot.start(process.env.TOKEN);

