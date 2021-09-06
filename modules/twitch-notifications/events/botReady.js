const {confDir} = require('../../../main');
const {embedType} = require('../../../src/functions/helpers');

const {ApiClient} = require('twitch');
const {ClientCredentialsAuthProvider} = require('twitch-auth');

function twitchNotifications(client, apiClient) {
    const config = require(`${confDir}/twitch-notifications/config.json`);
    function sendMsg(username, game, thumbnailUrl, channelID) {
        const channel = client.channels.cache.get(channelID);
        if (!channel) return console.error(`[twitch-notifications] Could not find channel with id ${channelID}`);
        channel.send(...embedType(config['liveMessage'], {
            '%streamer%': username,
            '%game%': game,
            '%url%': `https://twitch.tv/${username.toLowerCase()}`,
            '%thumbnailUrl': thumbnailUrl
        }));
    }

    async function isStreamLive(userName) {
        const user = await apiClient.helix.users.getUserByName(userName.toLowerCase());
        if (!user) return 'userNotFound';
        return await user.getStream();
    }

    config['streamers'].forEach(start);

    async function start(value, index) {
        const streamer = await client.models['twitch-notifications']['streamer'].findOne({
            where: {
                name: value.toLowerCase()
            }
        });
        const stream = await isStreamLive(value);
        if (stream === 'userNotFound') {
            return console.error(`Cannot find user ${value}`);
        } else if (stream !== null && !streamer) {
            client.models['twitch-notifications']['streamer'].create({
                name: value.toLowerCase(),
                startedAt: stream.startDate.toString()
            });
            sendMsg(stream.userDisplayName, stream.gameName, stream.thumbnailUrl, config['liveMessageChannels'][index]);
        } else if (stream !== null && stream.startDate.toString() !== streamer.startedAt) {
            streamer.startedAt = stream.startDate.toString();
            streamer.save();
            sendMsg(stream.userDisplayName, stream.gameName, stream.thumbnailUrl, config['liveMessageChannels'][index]);
        }
    }
}

exports.run = async (client) => {
    const config = require(`${confDir}/twitch-notifications/config.json`);

    const ClientID = config['twitchClientID'];
    const ClientSecret = config['clientSecret'];
    const authProvider = new ClientCredentialsAuthProvider(ClientID, ClientSecret);
    const apiClient = new ApiClient({authProvider});

    await twitchNotifications(client, apiClient);
    if (config['interval'] > 60) return console.error(`[twitch-notifications] The value of the interval must be equal or higher than 60`);
    const interval = config['interval'] * 1000;
    setInterval(() => {
        twitchNotifications(client, apiClient);
    }, interval);
};