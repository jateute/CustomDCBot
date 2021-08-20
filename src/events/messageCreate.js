const {embedType} = require('../functions/helpers');

exports.run = async (client, msg) => {
    if (!client.botReadyAt) return; // Check if bot is *really* ready
    if (msg.author.bot) return;
    if (!msg.guild) return;
    if (msg.guild.id !== client.guildID) return;
    if (!msg.content.startsWith(client.config.prefix) && !msg.content.startsWith(`<@${client.user.id}> `)  && !msg.content.startsWith(`<@!${client.user.id}> `)) return;
    const args = msg.content.split(msg.content.startsWith(client.prefix) ? client.config.prefix : msg.content.startsWith(`<@${client.user.id}> `) ? `<@${client.user.id}> ` : `<@!${client.user.id}> `).join('').trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    if (!client.aliases.has(command)) {
        if (!client.scnxSetup) return;
        return await require('../functions/scnx-integration').commandNotFoundCustomCommandCheck(client, msg, command, args);
    }
    const commandElement = client.commands.get(client.aliases.get(command));
    if (commandElement.config.restricted === true) {
        if (msg.author.id !== client.config.ownerID) return msg.channel.send(...embedType(client.strings.not_enough_permissions));
    }
    if (commandElement.config.args === true) {
        if (!args[0]) return msg.channel.send(...embedType(client.strings.need_args));
    }
    const commandFile = require(`./../../${commandElement.fileName}`);
    client.logger.debug(`${msg.author.tag} (${msg.author.id}) used command ${client.config.prefix}${command}.`);
    commandFile.run(client, msg, args);
};