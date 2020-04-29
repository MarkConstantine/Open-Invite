"use strict";

require("dotenv").config();
const Logger = require("./src/logger.js")(module);
const DiscordClient = require("./src/discord-client.js");
const CommandHandler = require("./src/command-handler.js");
const SessionManager = require("./src/session-manager.js");

const BOT_NAME = "Game-Queue";

DiscordClient.on("ready", () => {
  Logger.info(`Logged in as ${DiscordClient.user.tag}`);
});

DiscordClient.on("message", (message) => {
  CommandHandler.handle(message);
});

DiscordClient.on("messageReactionAdd", (reaction, user) => {
  if (user.username === BOT_NAME) return;
  SessionManager.handleReactionButtons(reaction, user);
});

DiscordClient.login(process.env.TOKEN);
