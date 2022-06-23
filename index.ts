import 'dotenv/config';
import { PrismaClient, Transactions } from '@prisma/client';
import { Client, Intents } from 'discord.js';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import { WebsocketProvider } from 'web3-providers-ws';
import express, { Application } from 'express';
import cors from 'cors';
import EventEmitter from 'events';
import fs from 'fs';
import Web3 from 'web3';

import config from './src/config';
import { Event } from './types/contract';
import { TransactionEvent } from './types/events';
import postTransactionEvent from './src/utils/postTransactionEvent';
import transactionsRoutes from './src/routes/transactions';
import logger from './logger';

const events: EventEmitter = new EventEmitter();

const transactions: Map<string, TransactionEvent> = new Map();

const prisma: PrismaClient = new PrismaClient();

const refreshProvider = (web3Obj: Web3, providerWs: string): WebsocketProvider => {
  let retries = 0;

  const retry = (event: string | null): number | WebsocketProvider | null => {
    if (event) {
      logger.error('Web3 disconnected or errored');
      console.log('Web3 disconnected or errored');
      retries++;

      if (retries > 5) {
        logger.error('Exceeded number of 5 retries');
        console.log('Exceeded number of 5 retries');
        return setTimeout(refreshProvider, 5000);
      }
    } else {
      logger.info('Reconnecting to the provider');
      console.log('Reconnecting to the provider');
      return refreshProvider(web3Obj, providerWs);
    }

    return null;
  };

  const provider: WebsocketProvider = new Web3.providers.WebsocketProvider(providerWs, {
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
      maxAttempts: 10,
      onTimeout: false,
    },
  });

  provider.on('end', retry as () => unknown | void);
  provider.on('error', retry as () => unknown | void);

  web3Obj.setProvider(provider);

  console.log('New Web3 provider initiated');
  logger.info('New Web3 provider initiated');

  return provider;
};

(() => {
  if (!config || !config.length) {
    return;
  }

  config.forEach((element) => {
    const web3: Web3 = new Web3();

    refreshProvider(web3, element.rpc);

    const ABI: unknown = fs.readFileSync(`./src/abi/${element.abi}.json`, 'utf-8');

    const contract: Contract = new web3.eth.Contract(JSON.parse(ABI as string) as AbiItem[], element.contractAddress);

    const discordData = {
      mainChannelIds: element.mainChannelIds,
      whaleChannelIds: element.whaleChannelIds,
    };

    contract.events
      .Transfer({}, (error: never) => {
        if (error) {
          logger.error(error);
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

        const isBurn: boolean = to.toLowerCase() === element.burnAddress.toLowerCase();

        const getTransactionEvent = (): TransactionEvent => {
          const getType = () => {
            if (!isFeeCollection && isBuy) {
              return 'buy';
            }

            if (!isFeeCollection && isSell) {
              return 'sell';
            }

            if (!isFeeCollection && isBurn) {
              return 'burn';
            }

            return 'fee';
          };

          return {
            hash: transactionHash,
            amount,
            explorer: element.explorer,
            getCurrentPrice: element.getCurrentPrice,
            name: element.name,
            type: getType(),
            ...discordData,
          };
        };

        const getTransactionEventAfterFees = (): TransactionEvent => {
          const fee = transactions.get(transactionHash);
          const transactionEvent = getTransactionEvent();

          if (fee) {
            if (fee.type !== 'fee') {
              return transactionEvent;
            }
            transactionEvent.amount = transactionEvent.amount + fee.amount;
            transactions.delete(transactionHash);
          }

          return transactionEvent;
        };

        const addBurnTransaction = async (): Promise<void> => {
          const transactionEvent = getTransactionEventAfterFees();
          const price = await transactionEvent.getCurrentPrice();

          await prisma.transactions.create({
            data: {
              name: transactionEvent.name,
              type: -1,
              amount: transactionEvent.amount,
              address: from,
              hash: transactionEvent.hash,
              price,
            },
          });
        };

        if (isBurn) {
          addBurnTransaction();
        }

        if (isFeeCollection && (!isBuy || !isSell)) {
          transactions.set(transactionHash, getTransactionEvent());
        }

        if (!isFeeCollection && isBuy && element.buyAmount > 0) {
          const transactionEvent = getTransactionEventAfterFees();

          if (transactionEvent.amount >= element.buyAmount) {
            events.emit('whale-buy', transactionEvent);
          }

          return;
        }

        if (!isFeeCollection && isSell && element.sellAmount > 0) {
          const transactionEvent = getTransactionEventAfterFees();

          if (transactionEvent.amount >= element.sellAmount) {
            events.emit('whale-sell', transactionEvent);
          }

          return;
        }
      })
      .on('error', (error: never) => {
        if (error) {
          logger.error(error);
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
    logger.info('Whale watcher discord bot running');

    events.on('whale-buy', async (data: TransactionEvent) => postTransactionEvent(client, data));
    events.on('whale-sell', async (data: TransactionEvent) => postTransactionEvent(client, data));
  });

  client.login(process.env.DISCORD_TOKEN);
})();

(() => {
  const server: Application = express();
  const port = process.env.PORT || 2500;

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.use(cors());

  server.use('/transactions', transactionsRoutes);

  server.listen(port, () => {
    console.log(`Transaction watcher listening on ${port}`);
  });
})();
