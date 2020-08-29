# Open-Invite

A Discord bot for creating an open invite to anything (games, events, etc.) for your users. Removes the hassle of having to ask everyone. Helps keep track of those involved. Built with **Discord.js** and **Node v12.16.2**.

![GIF of the bot in action](/docs/example.gif)

## How to Use

| How To                                                                                                   | Command                          |
|----------------------------------------------------------------------------------------------------------|----------------------------------|
| Print available commands                                                                                 | !help                            |
| Start a session                                                                                          | !start [NUMBER_OF_USERS] "TITLE" |
| End your session (deactivates the session but keeps it in the channel's history)                         | !end                             |
| Cancel your session (removes the session from the channel's history)                                     | !cancel                          |
| Add users to your session (users could also join by reacting with 👍)                                    | !add @username @username ...     |
| Remove users from your session (users could also leave by reacting with ✋)                              | !remove @username @username ...  |
| Change the number of slots for your session                                                              | !resize [NUMBER_OF_PLAYERS]      |
| Rename your session's title                                                                              | !rename "NEW TITLE"              |
| Advertise your session (repost your session so it's at the bottom of the chat)                           | !advertise                       |
| Flip a coin (for settling disbutes)                                                                      | !coinflip                        |
| Roll a dice with any number of sides                                                                     | !rolldice [NUMBER_OF_SIDES]      |
| Randomly assign your session's users into teams (Reset to normal session if [NUMBER_OF_TEAMS] is 0 or 1) | !teams [NUMBER_OF_TEAMS]         |

## Setup

1. Download the latest LTS Node version from [here](https://nodejs.org/en/) if you do not already have it.
2. Follow Discord's tutorial [here](https://discord.onl/2019/03/21/how-to-set-up-a-bot-application/) to create a new bot.
   - The permission integer required for this bot is **134293520**
   - Make note of the client token.
3. Download this project
   - Replace **`YOUR TOKEN HERE`** in the [.env](.env) file with the proper token for your bot.
4. Run the bot by traversing to this project's root directory and typing the following in a terminal _(assuming you have node defined in your path)_:
   - **`npm install`**
   - **`node src/app.js`**
