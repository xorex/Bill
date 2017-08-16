const Commando = require('discord.js-commando');
const request = require('request-promise');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);


class Restart extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'restart',
      guildOnly: true,
      group: 'admin',
      memberName: 'restart',
      description: 'Shuts down the server after 5 minutes. Assumes the server host will restart the server automatically.',
      examples: ['restart']
    });
  }

  async run(msg) {
    const client = this.client
    const timeout = 300000 // 5 minutes
    let minutes = timeout / 60000
    let amountOfTimesToCheckIfBackOnline = 10
    // Check if author of command is guild administrator or bot owner
    if (!client.checkIfAdmin(msg.member, msg.guild)) {
      client.logger.error(msg.author.username + " tried to run " + msg.content + " command but is not authorized!");
      return msg.channel.send("You need to have the administrator role to restart the server!");
    }

    msg.channel.send("Server will restart in 5 minutes");
    let interval = setInterval(async function() {
      if (minutes == 0) {
        msg.channel.send("Restarting the server now!");
        clearInterval(interval);
        restartServer();
      } else {
        msg.channel.send('Restarting the server in ' + minutes + ' minutes!');
        let requestOptions = await client.getRequestOptions(msg.guild, '/executeconsolecommand')
        requestOptions.qs.command = "say [ff00ff]Restarting_server_in_" + minutes + "_minutes."
        await request(requestOptions)
          .then(function() {})
          .catch(function(error, response) {
            client.logger.error("Error! Restart, console request failed: " + error);
            return msg.channel.send("Error executing a console command: " + error)
          })
      }
      minutes -= 1;
    }, 60000)

    async function restartServer() {
      // Kicking all players
      let requestOptions = await client.getRequestOptions(msg.guild, '/executeconsolecommand')
      requestOptions.qs.command = "kickall"
      await request(requestOptions)
        .then(async function() {
          client.logger.debug(msg.guild.name + " Succesfully kicked all players")
          // Saving the world
          let requestOptions = await client.getRequestOptions(msg.guild, '/executeconsolecommand')
          requestOptions.qs.command = "sa"
          await request(requestOptions)
            .then(async function() {
              client.logger.debug(msg.guild.name + " Succesfully saved the world")
              // Shutting down the server
              let requestOptions = await client.getRequestOptions(msg.guild, '/executeconsolecommand')
              requestOptions.qs.command = "shutdown"
              await request(requestOptions)
                .then(function() {
                  client.logger.debug(msg.guild.name + " Succesfully shut down the server")
                  msg.channel.send("Shutting down the server.")
                  // Check every 10 seconds until the server comes back online.
                  let CheckIfServerBackOnline = setInterval(async function() {
                    if (amountOfTimesToCheckIfBackOnline != 0) {
                      requestOptions = await client.getRequestOptions(msg.guild, '/executeconsolecommand');
                      requestOptions.qs.command = "help"
                      await request(requestOptions)
                        .then(function(data) {
                          clearInterval(CheckIfServerBackOnline)
                          client.logger.debug(msg.guild.name + " Server is back online!");
                          msg.channel.send("Server is back online!")
                        })
                        .catch(function(error) {
                          client.logger.debug(msg.guild.name + " Server is not online yet! Checking " + amountOfTimesToCheckIfBackOnline + " more times!");
                        })
                      amountOfTimesToCheckIfBackOnline -= 1;
                    } else {
                      clearInterval(CheckIfServerBackOnline)
                      client.logger.debug(msg.guild.name + " Server did not come back online in time!");
                      msg.channel.send("Server did not come back online in time!")
                    }
                  }, 10000);
                })
                .catch(function(error, response) {
                  client.logger.error("Error! Restart, console request failed: " + error);
                  throw error
                })
            })
            .catch(function(error, response) {
              client.logger.error("Error! Restart, console request failed: " + error);
              throw error
            })
        })
        .catch(function(error, response) {
          client.logger.error("Error! Restart, console request failed: " + error);
          return msg.channel.send("Error restarting the server: " + error)
        })
    }


  }
}

module.exports = Restart;