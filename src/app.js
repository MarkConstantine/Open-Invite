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

    ["SIGINT"].forEach((eventType) => {
      process.on(eventType, this.stop.bind(this, eventType));
    });

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

    this.discordBot.on("voiceStateUpdate", (oldMember, newMember) => {
      if (oldMember.channel === null && newMember.channel !== null) {
        Logger.debug(`Client ${newMember.id} connected to a voice channel.`);
        this.getGuildSessionManager(newMember.guild).markUserSessionEligibleForCleanup(newMember.id);
      }
      if (newMember.channel === null) {
        Logger.debug(`Client ${newMember.id} disconnected from a voice channel.`);
        this.getGuildSessionManager(newMember.guild).tryCleanupOldSessions();
      }
    });
  }

  addNewGuild(guild) {
    Logger.info(`Adding server ${guild.id}. Creating new CommandHandler and SessionManager`);
    this.myGuilds[guild.id] = new CommandHandler(new SessionManager(this.discordBot, guild));
  }

  getGuildSessionManager(guild) {
    const sessionManager = this.myGuilds[guild.id].sessionManager;

    if (sessionManager === undefined) {
      Logger.error(`Could not find a session manager for guild=${guild.id}`);
    }

    return sessionManager;
  }

  getGuildCommandHandler(guild) {
    const commandHandler = this.myGuilds[guild.id];

    if (commandHandler === undefined) {
      Logger.error(`Could not find a command handler for guild=${guild.id}`);
    }

    return commandHandler;
  }

  start(token) {
    Logger.info(`Starting ${this.botName}`);

    this.discordBot
      .login(token)
      .then(() => {
        this.discordBot.getConnectedServers().forEach(guild => {
          this.addNewGuild(guild);
        });
      })
      .catch(error => {
        Logger.error(`Failed to login. ${error}`);
        process.exit();
      });
  }

  stop(eventType) {
    Logger.info(`Stopping ${this.botName} (Reason=${eventType})`);

    for (const [guildId, commandHandler] of Object.entries(this.myGuilds)) {
      Logger.info(`Ending all sessions in guild=${guildId}`);
      commandHandler.sessionManager.endAllSessions();
    }

    const sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    // Sleeping before exiting to make sure all exit-related API requests go through.
    // Not the best solution but it works. ¯\_(ツ)_/¯
    Logger.info("Sleeping...");
    sleep(5000).then(() => {
      Logger.info("Exiting...");
      process.exit();
    });
  }
}

const bot = new OpenInvite();
bot.start(process.env.TOKEN);

