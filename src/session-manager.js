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
  constructor(discordBot, guild, config = {
    MAX_SESSION_SIZE: 50,
    MIN_SESSION_LIFETIME_MS: 3 * 60 * 60 * 1000, // 3 Hours
    MAX_SESSION_LIFETIME_MS: 24 * 60 * 60 * 1000, // 24 Hours
    CLEANUP_INTERVAL_MS: 6 * 60 * 60 * 1000, // 6 Hours
    DEFAULT_SESSION_SIZE: 4,
    DEFAULT_TITLE: "Gaming Sesh",
  }) {
    this.discordBot = discordBot;
    this.guild = guild;
    this.config = config;
    this.sessions = {};
    setInterval(() => this.cleanupOldSessions(), this.config.CLEANUP_INTERVAL_MS);
  }

  /**
   * Obtain the session owned by the provided user.
   * @param {number} hostId The ID of the user.
   * @returns {Session} The session owned by the user. Returns undefined if the user does not have an active session.
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
      Logger.error(`${this.startSession.name}, host=${host.tag}, `
        + `sessionSize=${sessionSize}, MAX_SESSION_SIZE=${this.config.MAX_SESSION_SIZE}`);
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
   * Forcefully end all sessions registered under this SessionManager.
   */
  endAllSessions() {
    for (const [hostId, session] of Object.entries(this.sessions)) {
      Logger.info(`${this.endAllSessions.name}. Ending session from host=${hostId}`);
      session.end();
      this.deleteSessionFromUserId(hostId);
    }
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
      Logger.error(`${this.resizeSession.name}, host=${host.tag}, `
        + `newSize=${newSize}, MAX_SESSION_SIZE=${this.config.MAX_SESSION_SIZE}`);
      message.reply(`The number of users a session could have is between 1 and ${this.config.MAX_SESSION_SIZE}.`);
      return;
    }
    message.delete(); // Clear the caller's command.
    const session = this.getSessionFromUserId(host.id);
    if (!session.resize(newSize)) {
      Logger.error(`${this.resizeSession.name}, host=${host.tag}, `
        + `newSize=${newSize}. Connected users = ${session.connected}`);
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
   * End any dormant sessions that have existed longer than the configurable MAX_SESSION_LIFETIME_MS.
   */
  cleanupOldSessions() {
    Logger.info(`${this.cleanupOldSessions.name}, Starting cleanup routine`);
    const now = new Date();
    for (const [hostId, session] of Object.entries(this.sessions)) {
      const maxSessionLifetimeEndTime = new Date(session.startTime.getTime() + this.config.MAX_SESSION_LIFETIME_MS);
      if (now >= maxSessionLifetimeEndTime) {
        Logger.info(`Session marked for cleanup from user: ${hostId}`);
        session.end();
        this.deleteSessionFromUserId(hostId);
      }
    }
    Logger.info(`${this.cleanupOldSessions.name}, Ending cleanup routine`);
  }

  /**
   * Mark a user's session as eligible to be cleaned up early.
   * Does nothing if the user does not have a session.
   * @param {number} userId The ID of the user.
   */
  markUserSessionEligibleForCleanup(userId) {
    const session = this.getSessionFromUserId(userId);
    if (session !== undefined && !session.isEligibleForEarlyCleanup) {
      session.isEligibleForEarlyCleanup = true;
      Logger.info(`User ${userId} session marked eligible for early cleanup`);
    }
  }

  /**
   * Manually end any session in which none of its users are connected to a voice channel.
   * A session must be active for atleast MIN_SESSION_LIFETIME_MS before it is to be considered.
   */
  tryCleanupOldSessions() {
    Logger.info(`${this.tryCleanupOldSessions.name}, Starting try cleanup routine`);
    const now = new Date();
    for (const [hostId, session] of Object.entries(this.sessions)) {
      if (!session.isEligibleForEarlyCleanup) continue;

      const minSessionLifetimeEndTime = new Date(session.startTime.getTime() + this.config.MIN_SESSION_LIFETIME_MS);
      if (now < minSessionLifetimeEndTime) continue; // Session is not active for long enough.

      const usersConnectedToVoice = this.discordBot.getUsersConnectedToVoiceInGuild(this.guild);
      const sessionUsers = session.users.filter(uid => uid !== undefined);

      const sessionUsersStillConnectedToVoice = usersConnectedToVoice.filter(user =>
        (user.id === session.host.id) || sessionUsers.some(u => u.id === user.id));

      Logger.debug(`${this.tryCleanupOldSessions.name},\n`
        + `usersConnectedToVoice(${usersConnectedToVoice.length})=\n`
        + `${usersConnectedToVoice.join("\n")}\n`
        + `sessionUsers(${sessionUsers.length})=\n`
        + `${sessionUsers.join("\n")}\n`
        + `sessionUsersStillConnectedToVoice(${sessionUsersStillConnectedToVoice.length})=\n`
        + `${sessionUsersStillConnectedToVoice.join("\n")}`);

      if (sessionUsersStillConnectedToVoice.length === 0) {
        Logger.info(`Session marked for cleanup from user: ${hostId}`);
        session.end();
        this.deleteSessionFromUserId(hostId);
      }
    }
    Logger.info(`${this.tryCleanupOldSessions.name}, Ending try cleanup routine`);
  }

  /**
   * Determine if a user's reaction is a reaction button used for this bot.
   * @param {MessageReaction} reaction The reaction message to check.
   * @param {User} user The user who made the reaction.
   */
  handleReactionButtons(reaction, user) {
    Logger.debug(`${this.handleReactionButtons.name}, ${user.tag} reacted with ${reaction.emoji.name} `
      + `to message ${reaction.message.id}`);

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
      if (session.getEmbedMessageId() === reaction.message.id && !session.isUserConnected(user)) {

        if (!session.isReadyForInput) {
          Logger.info(`${this.addUserToSessionFromReaction.name}. Session not ready`);
          break;
        }

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
      if (session.getEmbedMessageId() === reaction.message.id && session.isUserConnected(user)) {

        if (!session.isReadyForInput) {
          Logger.info(`${this.removeUserFromSessionFromReaction.name}. Session not ready`);
          break;
        }

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

    if (numberOfTeams > session.users.length) {
      Logger.error(`${this.randomizeTeams.name}, host=${host.tag}. Session size is ${session.users.length}. `
        + `Cannot divide into teams of ${numberOfTeams}`);
      message.reply(`Session size is ${session.users.length}. Cannot divide into teams of ${numberOfTeams}`);
      return;
    }

    session.randomizeTeams(numberOfTeams);
  }
}

module.exports = SessionManager;
