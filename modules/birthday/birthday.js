/**
 * Manages the birthday-embed
 * @module Birthdays
 * @author Simon Csaba <mail@scderox.de>
 */
const {embedType, disableModule, truncate, embedTypeV2, formatDiscordUserName} = require('../../src/functions/helpers');
const {MessageEmbed} = require('discord.js');
const {AgeFromDate} = require('age-calculator');
const {localize} = require('../../src/functions/localize');

/**
 * Generate the BirthdayEmbed in the configured channel
 * @param {Client} client Client
 * @param {boolean} notifyUsers If enabled the bot will notify users who have birthday today
 * @returns {Promise<void>}
 */
generateBirthdayEmbed = async function (client, notifyUsers = false) {
    const moduleConf = client.configurations['birthday']['config'];

    const channel = await client.channels.fetch(moduleConf['channelID']).catch(() => {
    });
    if (!channel) return disableModule('birthdays', localize('birthdays', 'channel-not-found', {c: moduleConf.channelID}));
    if (!moduleConf.enableBirthdayEmbed) {
        if (notifyUsers) await notifyBirthdayUsers();
        return;
    }
    const messages = (await channel.messages.fetch()).filter(msg => msg.author.id === client.user.id);
    await channel.guild.members.fetch({force: true});

    if (notifyUsers && !moduleConf.notificationChannelOverwriteID) {
        for (const m of messages.filter(msg => msg.id !== messages.last().id)) {
            if (m.deletable) await m.delete(); // Removing old messages
        }
    }

    const embeds = [
        new MessageEmbed()
            .setTitle(moduleConf['birthdayEmbed']['title'])
            .setDescription(moduleConf['birthdayEmbed']['description'])
            .setColor(moduleConf['birthdayEmbed']['color'])
            .setAuthor({name: client.user.username, iconURL: client.user.avatarURL()})
            .setFooter({text: client.strings.footer, iconURL: client.strings.footerImgUrl})
            .addFields([
                {
                    name: localize('months', '1'),
                    value: await getUserStringForMonth(client, channel, 1),
                    inline: true
                },
                {
                    name: localize('months', '2'),
                    value: await getUserStringForMonth(client, channel, 2),
                    inline: true
                },
                {
                    name: localize('months', '3'),
                    value: await getUserStringForMonth(client, channel, 3),
                    inline: true
                },
                {
                    name: localize('months', '4'),
                    value: await getUserStringForMonth(client, channel, 4),
                    inline: true
                },
                {
                    name: localize('months', '5'),
                    value: await getUserStringForMonth(client, channel, 5),
                    inline: true
                },
                {
                    name: localize('months', '6'),
                    value: await getUserStringForMonth(client, channel, 6),
                    inline: true
                },
                {
                    name: localize('months', '7'),
                    value: await getUserStringForMonth(client, channel, 7),
                    inline: true
                },
                {
                    name: localize('months', '8'),
                    value: await getUserStringForMonth(client, channel, 8),
                    inline: true
                },
                {
                    name: localize('months', '9'),
                    value: await getUserStringForMonth(client, channel, 9),
                    inline: true
                },
                {
                    name: localize('months', '10'),
                    value: await getUserStringForMonth(client, channel, 10),
                    inline: true
                },
                {
                    name: localize('months', '11'),
                    value: await getUserStringForMonth(client, channel, 11),
                    inline: true
                },
                {
                    name: localize('months', '12'),
                    value: await getUserStringForMonth(client, channel, 12),
                    inline: true
                }])
    ];

    if ((moduleConf['birthdayEmbed']['thumbnail'] || '').replaceAll(' ', '')) embeds[0].setThumbnail(moduleConf['birthdayEmbed']['thumbnail']);
    if ((moduleConf['birthdayEmbed']['image'] || '').replaceAll(' ', '')) embeds[0].setImage(moduleConf['birthdayEmbed']['image']);
    if (!client.strings.disableFooterTimestamp) embeds[0].setTimestamp();

    if (messages.last()) await messages.last().edit({embeds});
    else channel.send({embeds});

    if (notifyUsers) await notifyBirthdayUsers();

    /**
     * Notifies users who have birthday
     * @returns {Promise<void>}
     */
    async function notifyBirthdayUsers() {
        const birthdayUsers = await client.models['birthday']['User'].findAll({
            where: {
                month: new Date().getMonth() + 1,
                day: new Date().getDate()
            }
        });
        if (!birthdayUsers) return;

        if (moduleConf['birthday_role']) {
            const guildMembers = await channel.guild.members.fetch();
            for (const member of guildMembers.values()) {
                if (!member) return;
                if (member.roles.cache.has(moduleConf['birthday_role'])) {
                    await member.roles.remove(moduleConf['birthday_role']);
                }
            }
        }

        const birthdayMessageChannel = moduleConf.notificationChannelOverwriteID ? await client.guild.channels.fetch(moduleConf.notificationChannelOverwriteID) : channel;

        for (const user of birthdayUsers) {
            const member = channel.guild.members.cache.get(user.id);
            if (!member) return;
            if (user.year) {
                birthdayMessageChannel.send(await embedTypeV2(moduleConf['birthday_message_with_age'], {
                    '%age%': new Date().getFullYear() - user.year,
                    '%tag%': formatDiscordUserName(member.user),
                    '%username%': member.user.username,
                    '%avatarURL%': member.user.avatarURL() || member.user.defaultAvatarURL,
                    '%mention%': `<@${user.id}>`
                }));
            } else {
                birthdayMessageChannel.send(await embedTypeV2(moduleConf['birthday_message'], {
                    '%tag%': formatDiscordUserName(member.user),
                    '%avatarURL%': member.user.avatarURL() || member.user.defaultAvatarURL,
                    '%mention%': `<@${user.id}>`
                }));
            }
            if (moduleConf['birthday_role']) await member.roles.add(moduleConf['birthday_role']);
        }
    }
};

module.exports.generateBirthdayEmbed = generateBirthdayEmbed;

/**
 * Get UserString for a month
 * @private
 * @param {Client} client Client
 * @param {Channel} channel Channel to send embed in
 * @param {Number} month Month to render results from
 * @returns {Promise<string>}
 */
async function getUserStringForMonth(client, channel, month) {
    const monthData = await client.models['birthday']['User'].findAll({
        where: {
            month: month
        }
    });
    monthData.sort((a, b) => {
        return a.day - b.day;
    });
    let string = '';
    for (const user of monthData) {
        let dateString = `${user.day}.${month}${user.year ? `.${user.year}` : ''}`;
        if (user.year && !client.configurations['birthday']['config'].disableSync) {
            const age = new AgeFromDate(new Date(user.year, user.month - 1, user.day)).age;
            if (age < 13 || age > 125) {
                await user.destroy();
                continue;
            }
            dateString = `[${dateString}](https://sc-network.net/age?age=${age} "${localize('birthdays', 'age-hover', {a: age})}")`;
        }
        if (channel.guild.members.cache.get(user.id)) string = string + `${dateString}: ${client.configurations['birthday']['config'].useTags ? formatDiscordUserName(channel.guild.members.cache.get(user.id).user) : channel.guild.members.cache.get(user.id).user.toString()}\n`;
    }
    if (string.length === 0) string = localize('birthdays', 'no-bd-this-month');
    return truncate(string, 1024);
}