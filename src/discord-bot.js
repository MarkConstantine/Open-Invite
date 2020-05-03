"use strict";
const { Client } = require("discord.js");
const Logger = require("./logger.js")(module);

class DiscordBot extends Client {
  constructor() {
    super();

    this.on("ready", () => {
      Logger.info(`Logged in as ${this.user.tag}`);
    });

    this.on("guildCreate", guild => {
      Logger.info(`guildCreate, This bot was added to guild: ${guild.name}`);
      guild.members.fetch()
        .then(Logger.info("Updated user cache"))
        .catch(error => Logger.error(`Error fetching members on guildCreate: ${error}`));
    });

    this.on("guildMemberAdd", member => {
      Logger.info(`guildMemberAdd, ${member.nickname}(ID=${member.id}) joined ${member.guild.name}`);
      member.fetch()
        .then(Logger.info("Updated user cache"))
        .catch(error => Logger.error(`Error fetching members on guildMemberAdd: ${error}`));
    });
  }

  start(token) {
    this.login(token);
  }

  getUser(usernameOrMention) {
    if (usernameOrMention.startsWith("<@!")) {
      // Is mention.
      const id = usernameOrMention.match(/\d+/g)[0];
      return this.users.cache.find((user) => user.id === id);
    } else {
      // Is username.
      return this.users.cache.find(
        (user) => user.username === usernameOrMention
      );
    }
  }
}

module.exports = DiscordBot;
