"use strict";
const { Client } = require("discord.js");

// Instantiate only once.
class _DiscordClient extends Client { 
    getUser(usernameOrMention) {
        if (usernameOrMention.startsWith("<@!")) {
            // Is mention.
            const id = usernameOrMention.match(/\d+/g)[0];
            return this.users.cache.find(user => user.id === id)
        } else {
            // Is username.
            return this.users.cache.find(user => user.username === usernameOrMention);
        }
    }
}

const DiscordClient = new _DiscordClient();
module.exports = DiscordClient;