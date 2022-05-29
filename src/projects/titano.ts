import axios from 'axios';
import { Config } from '../../types/config';

export const titano: Config = {
  rpc: 'wss://bsc-ws-node.nariox.org:443',
  explorer: 'https://bscscan.com/tx/',
  contractAddress: '0x4e3cABD3AD77420FF9031d19899594041C420aeE',
  caller: '0x6c957d7030fbac6e070c84b4370e3c8cb6e99cd7',
  exchangeAddress: '0x072856bC98e65ECaf8cA6412567e894617cC62c2',
  abi: 'titano',
  name: 'Titano',
  getCurrentPrice: async (): Promise<number> => {
    try {
      const {
        data: { data },
      } = await axios('https://titanchest.com/api/v1/stats/get/Titano');

      if (!data) {
        return 0;
      }

      return data[0].price;
    } catch (error) {
      console.log(error);
      return 0;
    }
  },
  decimals: 18,
  buyAmount: 1,
  sellAmount: 1,
  mainChannelIds: [{ name: "Wayne's Server", id: '918902350150787105' }],
  whaleChannelIds: [{ name: "Wayne's Server", id: '928398058012676179' }],
};
