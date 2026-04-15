import { defineChain, type Chain } from 'viem';

export const arcLocal = defineChain({
  id: 1337,
  name: 'Arc Local',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
  testnet: true,
});

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  testnet: true,
});

export interface NetworkConfig {
  chain: Chain;
  addresses: {
    hub: `0x${string}`;
    registry: `0x${string}`;
    tipJar: `0x${string}`;
    subscriptions: `0x${string}`;
    contentPaywall: `0x${string}`;
    payPerCall: `0x${string}`;
  };
}

export const NETWORKS: Record<'local' | 'testnet', NetworkConfig> = {
  local: {
    chain: arcLocal,
    addresses: {
      hub:             '0x1b38dE812703aaED3fE7B584e2a0E8D0b95F60Cb',
      registry:        '0xD85677eBC8b242E5110C69f1d1f134389319632C',
      tipJar:          '0xC627bf4D1f21dcc82Ef563191f63723CD290959f',
      subscriptions:   '0x0D4e458145A8eE377FD90295dd3332ee5BC90aE4',
      contentPaywall:  '0x352fc9770F1c72c0B91d7D62946EDa67A6288A95',
      payPerCall:      '0xc6f99Bdb0985aC8c5E7819f3e89dccA7C8A4C06a',
    },
  },
  testnet: {
    chain: arcTestnet,
    addresses: {
      hub:             '0x79ab5a4B2770BF087aF2fF4CEdb0E67A413bf293',
      registry:        '0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb',
      tipJar:          '0x45daE58fB5b89C4E994216D2af0B73232641DF3B',
      subscriptions:   '0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380',
      contentPaywall:  '0x680884124F21939548Ba7f982B4F275A55783484',
      payPerCall:      '0xe407A796D81302987Ef950bdC01Ef4eA0b081b6C',
    },
  },
};
