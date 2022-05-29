import { Channel } from './config';

export type TransactionEvent = {
  hash: string;
  amount: number;
  explorer: string;
  getCurrentPrice: () => Promise<number>;
  name: string;
  type: string;
  mainChannelIds: Channel[];
  whaleChannelIds: Channel[];
};
