export type Channel = {
  name: string;
  id: string;
};

export type Config = {
  rpc: string;
  explorer: string;
  contractAddress: string;
  caller: string;
  exchangeAddress: string;
  abi: string;
  name: string;
  getCurrentPrice: () => Promise<number>;
  decimals: number;
  buyAmount: number;
  sellAmount: number;
  mainChannelIds: Channel[];
  whaleChannelIds: Channel[];
};
