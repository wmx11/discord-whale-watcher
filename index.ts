import 'dotenv/config';
import { Client, Intents } from 'discord.js';
import { AbiItem } from 'web3-utils';
import { PrismaClient } from '@prisma/client';
import { Contract } from 'web3-eth-contract';
import { WebsocketProvider } from 'web3-providers-ws';
import express, { Application } from 'express';
import EventEmitter from 'events';
import fs from 'fs';
import Web3 from 'web3';

import config from './src/config';
import { Event } from './types/contract';
import { TransactionEvent } from './types/events';
import postTransactionEvent from './src/utils/postTransactionEvent';
import transactionsRoutes from './src/routes/transactions';

const prisma: PrismaClient = new PrismaClient();
const events: EventEmitter = new EventEmitter();
const server: Application = express();

(() => {
  if (!config || !config.length) {
    return;
  }

  config.forEach((element) => {
    const ws: WebsocketProvider = new Web3.providers.WebsocketProvider(element.rpc, {
      timeout: 30000, // ms
      clientConfig: {
        // Useful if requests are large
        maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
        maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

        // Useful to keep a connection alive
        keepalive: true,
        keepaliveInterval: 60000, // ms
      },
      reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: false,
      },
    });

    const web3: Web3 = new Web3(ws);

    const ABI: unknown = fs.readFileSync(`./src/abi/${element.abi}.json`, 'utf-8');

    const contract: Contract = new web3.eth.Contract(JSON.parse(ABI as string) as AbiItem[], element.contractAddress);

    const discordData = {
      mainChannelIds: element.mainChannelIds,
      whaleChannelIds: element.whaleChannelIds,
    };

    contract.events
      .Transfer({}, (error: never) => {
        if (error) {
          console.log(error);
        }
      })
      .on('data', (event: Event) => {
        const {
          transactionHash,
          returnValues: { from, to, value },
        } = event;

        const amount: number = parseInt(value, 10) / 10 ** element.decimals;

        const isFeeCollection: boolean =
          from.toLowerCase() === element.exchangeAddress.toLowerCase() &&
          to.toLowerCase() === element.contractAddress.toLowerCase();

        const isBuy: boolean =
          from.toLowerCase() === element.exchangeAddress.toLowerCase() &&
          to.toLowerCase() !== element.contractAddress.toLowerCase();

        const isSell: boolean =
          from.toLowerCase() !== element.contractAddress.toLowerCase() &&
          to.toLowerCase() === element.exchangeAddress.toLowerCase();

        if (!isFeeCollection && isBuy && element.buyAmount > 0) {
          if (amount >= element.buyAmount) {
            events.emit('whale-buy', {
              hash: transactionHash,
              amount,
              explorer: element.explorer,
              getCurrentPrice: element.getCurrentPrice,
              name: element.name,
              type: 'buy',
              ...discordData,
            } as TransactionEvent);
          }

          prisma.transactions.create({
            data: {
              name: element.name,
              type: 1,
              amount,
              hash: transactionHash,
            },
          });

          return;
        }

        if (!isFeeCollection && isSell && element.sellAmount > 0) {
          if (amount >= element.sellAmount) {
            events.emit('whale-sell', {
              hash: transactionHash,
              amount,
              explorer: element.explorer,
              getCurrentPrice: element.getCurrentPrice,
              name: element.name,
              type: 'sell',
              ...discordData,
            } as TransactionEvent);
          }

          prisma.transactions.create({
            data: {
              name: element.name,
              type: 0,
              amount,
              hash: transactionHash,
            },
          });

          return;
        }
      })
      .on('error', (error: never) => {
        if (error) {
          console.log(error);
        }
      });
  });
})();

(() => {
  const client: Client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  });

  client.once('ready', async () => {
    console.log('Whale Watcher running');
    events.on('whale-buy', async (data: TransactionEvent) => postTransactionEvent(client, data));
    events.on('whale-sell', async (data: TransactionEvent) => postTransactionEvent(client, data));
  });

  client.login(process.env.DISCORD_TOKEN);
})();

(() => {
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  server.use('/transactions', transactionsRoutes);

  server.listen(process.env.PORT, () => console.log('Server has started'));
})();
