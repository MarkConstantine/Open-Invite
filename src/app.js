"use strict";

require("dotenv").config();
const Logger = require("./logger.js")(module);
const DiscordBot = require("./discord-bot.js");
const CommandHandler = require("./command-handler.js");
const SessionManager = require("./session-manager.js");

class OpenInvite {
  constructor() {
    this.botName = "Open-Invite";
    this.discordBot = new DiscordBot();
    this.myGuilds = {};

    this.discordBot.on("guildCreate", guild => {
      Logger.info(`guildCreate, ${this.botName} was added to guild: ${guild.name}`);
      this.addNewGuild(guild);
      guild.members
        .fetch()
        .then(Logger.info("Updated user cache"))
        .catch(error => Logger.error(`Error fetching members on guildCreate: ${error}`));
    });

    this.discordBot.on("message", (message) => {
      this.getGuildCommandHandler(message.guild).handle(message);
    });

    this.discordBot.on("messageReactionAdd", (reaction, user) => {
      if (user.username === this.botName) return;
      this.getGuildSessionManager(reaction.message.guild).handleReactionButtons(reaction, user);
    });
  }

  addNewGuild(guild) {
    Logger.info(`Adding server ${guild.id}. Creating new CommandHandler and SessionManager`);
    this.myGuilds[guild.id] = new CommandHandler(new SessionManager(this.discordBot));
  }

  getGuildSessionManager(guild) {
    const sessionManager = this.myGuilds[guild.id].sessionManager;

    if (sessionManager === undefined) {
      Logger.error(`Could not find a session manager for guild=${guild.id}`);
    } else {
      Logger.info(`Found a session manager for guild=${guild.id}`);
    }

    return sessionManager;
  }

  getGuildCommandHandler(guild) {
    const commandHandler = this.myGuilds[guild.id];

    if (commandHandler === undefined) {
      Logger.error(`Could not find a command handler for guild=${guild.id}`);
    } else {
      Logger.info(`Found a command handler for guild=${guild.id}`);
    }

    return commandHandler;
  }

  start(token) {
    Logger.info(`Starting ${this.botName}`);

    this.discordBot
      .login(token)
      .then(_ => {
        this.discordBot.getConnectedServers().forEach(guild => {
          this.addNewGuild(guild);
        })
      })
      .catch(error => {
        Logger.error(`Failed to login. ${error}`);
        process.exit();
      });
  }
}

const bot = new OpenInvite();
bot.start(process.env.TOKEN);

