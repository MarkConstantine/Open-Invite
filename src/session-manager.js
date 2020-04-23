"use strict";
const DiscordClient = require("./discord-client.js");
const Session = require("./session.js");

// Instantiate only once.
class _SessionManager {
  constructor() {
    this.sessions = {};
    this.MAX_SESSION_SIZE = 50;
  }

  getSession(host) {
    return this.getSessionFromUserId(host.id);
  }

  getSessionFromUserId(id) {
    return this.sessions[id];
  }

  hasSession(host) {
    const id = host.id;
    return id in this.sessions;
  }

  setSession(host, newSession) {
    const id = host.id;
    this.sessions[id] = newSession;
  }

  deleteSession(host) {
    const id = host.id;
    delete this.sessions[id];
  }

  getUsers(message, usernameList) {
    const userList = [];
    for (const username of usernameList) {
      const user = DiscordClient.getUser(username);
      if (user === undefined) {
        message.reply(`Could not find user by the username: ${username}`);
      } else {
        userList.push(user);
      }
    }
    return userList;
  }

  startSession(message, host, title, playerCount) {
    if (this.hasSession(host)) {
      message.reply("You already have an active session. Please !end your existing sessions first.");
      return;
    }
    message.delete(); // Clear the caller's command.
    if (playerCount > this.MAX_SESSION_SIZE) {
      message.reply("The maximum number of players a session could have is 50 or less.");
      return;
    }
    const newSession = new Session(message, host, playerCount, title);
    this.setSession(host, newSession);
  }

  endSession(message, host) {
    if (!this.hasSession(host)) {
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    this.getSession(host).endSession();
    this.deleteSession(host);
  }

  addPlayersToSession(message, host, playerUsernameList) {
    if (!this.hasSession(host)) {
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSession(host);
    const playersNotAddedList = session.addPlayers(this.getUsers(message, playerUsernameList));
    if (playersNotAddedList.length > 0) {
      let responseString = "Could not add the following players: ";
      for (const player of playersNotAddedList) {
        responseString += player.username + " ";
      }
      message.reply(responseString);
      return;
    }
  }

  removePlayersFromSession(message, host, playerUsernameList) {
    if (!this.hasSession(host)) {
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSession(host);
    const playersNotRemovedList = session.removePlayers(this.getUsers(message, playerUsernameList));
    if (playersNotRemovedList.length > 0) {
      let responseString = "Could not remove the following players: ";
      for (const player of playersNotRemovedList) {
        responseString += player.username + " ";
      }
      message.reply(responseString);
      return;
    }
  }

  addPlayerToSessionFromReaction(reaction, player) {
    const sessionMessageId = reaction.message.id;

    // #TODO: For now we loop through all active sessions to match the reaction message's ID with an Embed Message ID,
    // but eventually this loop needs to be refactored to something more performant.
    for (const [hostId, session] of Object.entries(this.sessions)) {
      if (session.embedMessage.id === sessionMessageId) {
        const session = this.getSessionFromUserId(hostId);
        session.addPlayers([player]); // Ignoring return value.
        break;
      }
    }
  }

  removePlayerFromSessionFromReaction(reaction, player) {
    const sessionMessageId = reaction.message.id;

    // #TODO: For now we loop through all active sessions to match the reaction message's ID with an Embed Message ID,
    // but eventually this loop needs to be refactored to something more performant.
    for (const [hostId, session] of Object.entries(this.sessions)) {
      if (session.embedMessage.id === sessionMessageId) {
        const session = this.getSessionFromUserId(hostId);
        session.removePlayers([player]); // Ignoring return value
        break;
      }
    }
  }

  resizeSession(message, host, newPlayerCount) {
    if (newPlayerCount > this.MAX_SESSION_SIZE) {
      message.reply("The maximum number of players a session could have is 50 or less.");
      return;
    }
    const session = this.getSession(host);
    if (!session.resizePlayerCount(newPlayerCount)) {
      message.reply(`Cannot resize the session to ${newPlayerCount} because there's ${session.connected} connected player(s)`);
      return;
    }
  }
}

const SessionManager = new _SessionManager();
module.exports = SessionManager;
