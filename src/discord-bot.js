"use strict";
const { Client } = require("discord.js");
const Logger = require("./logger.js")(module);

class DiscordBot extends Client {
  constructor() {
    super();

    this.on("ready", () => {
      Logger.info(`Logged in as ${this.user.tag}`);
    });

    this.on("guildMemberAdd", member => {
      Logger.info(`guildMemberAdd, ${member.user.username}(ID=${member.id}) joined ${member.guild.name}`);
      member.fetch()
        .then(Logger.info("Updated user cache"))
        .catch(error => Logger.error(`Error fetching members on guildMemberAdd: ${error}`));
    });
  }

  getConnectedServers() {
    return this.guilds.cache;
  }

  getUser(username) {
    // Mentions: <@!userId>
    if (username.startsWith("<@!")) {
      const id = username.match(/\d+/g)[0];
      return this.users.cache.find((user) => user.id === id);
    }

    // Tags: username#TAG
    if (username.includes("#")) {
      return this.users.cache.find((user) => user.tag == username);
    }

    // Only username
    return this.users.cache.find((user) => user.username === username);
  }

  getUsersConnectedToVoiceInGuild(guild) {
    let result = [];

    const voiceChannels = guild.channels.cache.filter(channel => channel.type === "voice");
    voiceChannels.forEach(voiceChannel => {
      voiceChannel.members.forEach(member => result.push(member.user));
    });

    return result;
  }
}

module.exports = DiscordBot;
