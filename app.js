"use strict";

require("dotenv").config();
const DiscordClient = require("./src/discord-client.js");
const CommandHandler = require("./src/command-handler.js");
const SessionManager = require("./src/session-manager.js");

const BOT_NAME = "Game-Queue";
const CLEANUP_INTERVAL_MS = 1 * 60 * 60 * 1000 // 1 Hour

DiscordClient.on("ready", () => {
  console.log(`Logged in as ${DiscordClient.user.tag}`);
});

DiscordClient.on("message", (message) => {
  CommandHandler.handle(message);
  setInterval(() => SessionManager.cleanupOldSessions(), CLEANUP_INTERVAL_MS);
  
});

DiscordClient.on("messageReactionAdd", (reaction, user) => {
  if (user.username === BOT_NAME) return;
  SessionManager.handleReactionButtons(reaction, user);
});

DiscordClient.login(process.env.TOKEN);
