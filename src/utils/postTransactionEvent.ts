import { Client, Collection, Guild, NonThreadGuildBasedChannel, OAuth2Guild } from 'discord.js';
import { Channel } from '../../types/config';
import { TransactionEvent } from '../../types/events';
import makeEmbeddedMessage from './embedMessage';

const handleMainChannelMessage = async (channel: NonThreadGuildBasedChannel, data: TransactionEvent): Promise<void> => {
  const message = `📣 **Someone just ${
    data.type === 'sell' ? '*__SOLD__*' : '*__BOUGHT__*'
  } ${data.amount.toLocaleString()} ${data.name}!** 📣
  
    <${data.explorer}${data.hash}>
  `;

  try {
    if (channel !== null) {
      if (channel.isText()) {
        channel.send(message);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const handleWhaleChannelMessage = async (
  channel: NonThreadGuildBasedChannel,
  data: TransactionEvent,
): Promise<void> => {
  const embeddedMessage: object = await makeEmbeddedMessage(data);

  try {
    if (channel !== null) {
      if (channel.isText()) {
        channel.send({ content: '<@everyone>', embeds: [embeddedMessage] });
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const handleChannels = async (
  channels: Collection<string, NonThreadGuildBasedChannel>,
  type: string,
  data: TransactionEvent,
): Promise<void> => {
  try {
    channels.forEach((channel) => {
      switch (type) {
        case 'main':
          handleMainChannelMessage(channel, data);
          break;

        case 'whale':
          handleWhaleChannelMessage(channel, data);
          break;
        default:
          break;
      }
    });
  } catch (error) {
    console.log(error);
  }
};

const handleGuilds = async (guild: OAuth2Guild, data: TransactionEvent): Promise<void> => {
  const thisGuild: Guild = await guild.fetch();
  const channels: Collection<string, NonThreadGuildBasedChannel> = await thisGuild.channels.fetch();

  const mainChannels: Collection<string, NonThreadGuildBasedChannel> = channels.filter(
    (channel: NonThreadGuildBasedChannel): boolean => {
      return !!data.mainChannelIds.find((mainChannel: Channel) => mainChannel.id === channel.id);
    },
  );

  const whaleChannels: Collection<string, NonThreadGuildBasedChannel> = channels.filter(
    (channel: NonThreadGuildBasedChannel): boolean => {
      return !!data.whaleChannelIds.find((whaleChannel: Channel) => whaleChannel.id === channel.id);
    },
  );

  handleChannels(mainChannels, 'main', data);
  handleChannels(whaleChannels, 'whale', data);
};

const postTransactionEvent = async (client: Client, data: TransactionEvent): Promise<void> => {
  try {
    const guilds: Collection<string, OAuth2Guild> = await client.guilds.fetch();
    guilds.forEach((guild: OAuth2Guild) => handleGuilds(guild, data));
  } catch (error) {
    console.log(error);
  }
};

export default postTransactionEvent;
