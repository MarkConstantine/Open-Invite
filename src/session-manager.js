"use strict";
const Logger = require("./logger.js")(module);
const Session = require("./session.js");

/** Class to manage all active sessions registered for this bot. */
class SessionManager {
  /**
   * Create a new SessionManager with the provided configurations.
   * @param {DiscordBot} discordBot Dependency for performing Discord specific operations.
   * @param {*} config Object containing various configurations for the SessionManager.
   */
  constructor(discordBot, config = {
    MAX_SESSION_SIZE: 50,
    MAX_SESSION_DURATION_MS: 12 * 60 * 60 * 1000, // 12 Hours
    CLEANUP_INTERVAL_MS: 6 * 60 * 60 * 1000, // 6 Hours
    DEFAULT_SESSION_SIZE: 4,
    DEFAULT_TITLE: "Gaming Sesh",
  }) {
    this.discordBot = discordBot;
    this.config = config;
    this.sessions = {};
    setInterval(() => this.cleanupOldSessions(), this.config.CLEANUP_INTERVAL_MS);
  }

  /**
   * Obtain the session owned by the provided user.
   * @param {number} hostId The ID of the user.
   * @returns {Session} The session owned by the provided user. Returns undefined if the user does not have an active session.
   */
  getSessionFromUserId(hostId) {
    Logger.info(`${this.getSessionFromUserId.name}, userId=${hostId}`);
    return this.sessions[hostId];
  }

  /**
   * Determine if the provided user has a registered session.
   * @param {User} host The user to check.
   * @returns {boolean} Return true if the user has an active session. False otherwise.
   */
  hasSession(host) {
    Logger.info(`${this.hasSession.name}, user=${host.tag}, ${host.id in this.sessions}`);
    return host.id in this.sessions;
  }

  /**
   * Assign a session to the provided user.
   * @param {User} host The user to assign the session to.
   * @param {Session} newSession The session to be assigned.
   */
  setSession(host, newSession) {
    Logger.info(`${this.setSession.name}, Assigning session to ${host.tag}`);
    this.sessions[host.id] = newSession;
  }

  /**
   * Remove the provided user's session.
   * @param {number} hostId The ID of the user.
   */
  deleteSessionFromUserId(hostId) {
    Logger.info(`${this.deleteSessionFromUserId.name}, userId=${hostId}`);
    delete this.sessions[hostId];
  }

  /**
   * Get the User object for each username in usernameList. Informs the caller
   * for every user that could not be found.
   * @param {Message} message The original message to respond to.
   * @param {string[]} usernameList A list of usernames to lookup.
   * @returns {User[]} A list of Users that were found.
   */
  getUsers(message, usernameList) {
    const userList = [];
    for (const username of usernameList) {
      const user = this.discordBot.getUser(username);
      if (user === undefined) {
        Logger.error(`${this.getUsers.name}, Could not find user ${username}`);
        message.reply(`Could not find user by the username: ${username}`);
      } else {
        Logger.info(`${this.getUsers.name}, Found user ${username}`);
        userList.push(user);
      }
    }
    return userList;
  }

  /**
   * Start a session for the provided user.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to start.
   * @param {string} title The title of the session.
   * @param {number} sessionSize The amount of open slots for the session.
   */
  startSession(message, host, title = this.config.DEFAULT_TITLE, sessionSize = this.config.DEFAULT_SESSION_SIZE) {
    if (this.hasSession(host)) {
      Logger.error(`${this.startSession.name}, host=${host.tag}. User already has an active session.`);
      message.reply("You already have an active session. Please !end your existing sessions first.");
      return;
    }
    if (sessionSize <= 0) {
      Logger.error(`${this.startSession.name}, host=${host.tag}, sessionSize=${sessionSize}`);
      message.reply("Cannot have a session size of 0 or less");
      return;
    }
    if (sessionSize > this.config.MAX_SESSION_SIZE) {
      Logger.error(`${this.startSession.name}, host=${host.tag}, sessionSize=${sessionSize}, MAX_SESSION_SIZE=${this.config.MAX_SESSION_SIZE}`);
      message.reply(`The number of users a session could have is between 1 and ${this.config.MAX_SESSION_SIZE}.`);
      return;
    }
    message.delete(); // Clear the caller's command.
    const newSession = new Session(message, host, sessionSize, title);
    this.setSession(host, newSession);
  }

  /**
   * End a session for the provided user.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to end.
   */
  endSession(message, host) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.endSession.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    session.end();
    this.deleteSessionFromUserId(host.id);
  }

  /**
   * Cancel a session for the provided user.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to cancel.
   */
  cancelSession(message, host) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.cancelSession.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    session.cancel();
    this.deleteSessionFromUserId(host.id);
  }

  /**
   * Add any number of users to the provided user's session.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to add the users to.
   * @param {string[]} usernameList List of usernames to add.
   */
  addUsersToSession(message, host, usernameList) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.addUsersToSession.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    const usersNotAddedList = session.addUsers(this.getUsers(message, usernameList));
    if (usersNotAddedList.length > 0) {
      let responseString = "Could not add the following users: ";
      for (const user of usersNotAddedList) {
        responseString += user.username + " ";
      }
      message.reply(responseString);
      return;
    }
  }

  /**
   * Remove any number of users to the provided user's session.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to remove the users from.
   * @param {string[]} usernameList List of usernames to remove.
   */
  removeUsersFromSession(message, host, usernameList) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.removeUsersFromSession.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    const usersNotRemovedList = session.removeUsers(this.getUsers(message, usernameList));
    if (usersNotRemovedList.length > 0) {
      let responseString = "Could not remove the following users: ";
      for (const user of usersNotRemovedList) {
        responseString += user.username + " ";
      }
      message.reply(responseString);
      return;
    }
  }

  /**
   * Resize the number of slots for the provided user's session.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to resize.
   * @param {number} newSize The new number of slots to resize to.
   */
  resizeSession(message, host, newSize) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.resizeSession.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    if (newSize <= 0) {
      Logger.error(`${this.resizeSession.name}, host=${host.tag}, newSize=${newSize}`);
      message.reply("Cannot have a session size of 0 or less");
      return;
    }
    if (newSize > this.config.MAX_SESSION_SIZE) {
      Logger.error(`${this.resizeSession.name}, host=${host.tag}, newSize=${newSize}, MAX_SESSION_SIZE=${this.config.MAX_SESSION_SIZE}`);
      message.reply(`The number of users a session could have is between 1 and ${this.config.MAX_SESSION_SIZE}.`);
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    if (!session.resize(newSize)) {
      Logger.error(`${this.resizeSession.name}, host=${host.tag}, newSize=${newSize}. Connected users = ${session.connected}`);
      message.reply(`Cannot resize the session to ${newSize} because there's ${session.connected} connected user(s).`);
      return;
    }
  }

  /**
   * Rename the title of the session for the provided user.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to rename.
   * @param {string} newTitle The new title.
   */
  renameSession(message, host, newTitle = this.config.DEFAULT_TITLE) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.renameSession.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    session.rename(newTitle);
  }

  /**
   * Repost the provided user's session so that it is at the bottom of the chat.
   * @param {Message} message The original message to respond to if any issues occur.
   * @param {User} host The owner of the session to advertise.
   */
  advertiseSession(message, host) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.advertiseSession.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    session.update();
  }

  /**
   * End any dormant sessions that have existed longer than the configurable MAX_SESSION_DURATION_MS.
   */
  cleanupOldSessions() {
    Logger.info(`${this.cleanupOldSessions.name}, Starting cleanup routine`);
    const now = new Date();
    for (const [hostId, session] of Object.entries(this.sessions)) {
      const compare = new Date(session.startTime.getTime() + this.config.MAX_SESSION_DURATION_MS);
      if (now >= compare) {
        Logger.info(`Session marked for cleanup from user: ${hostId}`);
        session.end();
        this.deleteSessionFromUserId(hostId);
      }
    }
    Logger.info(`${this.cleanupOldSessions.name}, Ending cleanup routine`);
  }

  /**
   * Determine if a user's reaction is a reaction button used for this bot.
   * @param {MessageReaction} reaction The reaction message to check.
   * @param {User} user The user who made the reaction.
   */
  handleReactionButtons(reaction, user) {
    Logger.info(`${this.handleReactionButtons.name}, User ${user.tag} reacted with ${reaction.emoji.name}`);

    if (reaction.emoji.name === Session.joinButton) {
      this.addUserToSessionFromReaction(reaction, user);
    }

    if (reaction.emoji.name === Session.leaveButton) {
      this.removeUserFromSessionFromReaction(reaction, user);
    }

    // Do nothing if the reaction is not one of the buttons.
  }

  /**
   * Add the user to the appropriate session if they reacted with the join button.
   * @param {MessageReaction} reaction The reaction message to check.
   * @param {User} user The user who made the reaction.
   */
  addUserToSessionFromReaction(reaction, user) {
    // #TODO: For now we loop through all active sessions to match the reaction message's ID with an Embed Message ID,
    // but eventually this loop needs to be refactored to something more performant.
    for (const hostId in this.sessions) {
      const session = this.getSessionFromUserId(hostId);
      // Don't do anything if the user is already connected.
      if (session.embedMessage.id === reaction.message.id && !session.isUserConnected(user)) {
        session.addUsers([user]); // Ignoring return value.
        break;
      }
    }

    // If we couldn't match the reaction's message id with a session's embed message id,
    // then the reaction was for some unrelated message. Thus we ignore it.
  }

  /**
   * Remove the user from the appropriate session if they reaction with the leave button.
   * @param {MessageReaction} reaction The reaction message to check.
   * @param {User} user The user who made the reaction.
   */
  removeUserFromSessionFromReaction(reaction, user) {
    // #TODO: For now we loop through all active sessions to match the reaction message's ID with an Embed Message ID,
    // but eventually this loop needs to be refactored to something more performant.
    for (const hostId in this.sessions) {
      const session = this.getSessionFromUserId(hostId);
      // Don't do anything if the user is not connected.
      if (session.embedMessage.id === reaction.message.id && session.isUserConnected(user)) {
        session.removeUsers([user]); // Ignoring return value
        break;
      }
    }

    // If we couldn't match the reaction's message id with a session's embed message id,
    // then the reaction was for some unrelated message. Thus we ignore it.
  }

  randomizeTeams(message, host, numberOfTeams = 2) {
    if (!this.hasSession(host)) {
      Logger.error(`${this.randomizeTeams.name}, host=${host.tag}. User does not have an active session.`);
      message.reply("You have no active sessions?");
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    session.randomizeTeams(numberOfTeams);
  }
}

module.exports = SessionManager;
