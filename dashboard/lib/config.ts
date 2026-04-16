import { defineChain } from 'viem';

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'local') as 'local' | 'testnet';

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

export const CHAIN = NETWORK === 'testnet' ? arcTestnet : arcLocal;

export const ADDRESSES = NETWORK === 'testnet' ? {
  hub:             '0x79ab5a4B2770BF087aF2fF4CEdb0E67A413bf293',
  registry:        '0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb',
  tipJar:          '0x45daE58fB5b89C4E994216D2af0B73232641DF3B',
  subscriptions:   '0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380',
  contentPaywall:  '0x680884124F21939548Ba7f982B4F275A55783484',
  payPerCall:      '0x3a399A310965A5cbD5a2B9F21a3B9885B6372def',
} as const : {
  hub:             '0x1b38dE812703aaED3fE7B584e2a0E8D0b95F60Cb',
  registry:        '0xD85677eBC8b242E5110C69f1d1f134389319632C',
  tipJar:          '0xC627bf4D1f21dcc82Ef563191f63723CD290959f',
  subscriptions:   '0x0D4e458145A8eE377FD90295dd3332ee5BC90aE4',
  contentPaywall:  '0x352fc9770F1c72c0B91d7D62946EDa67A6288A95',
  payPerCall:      '0xc6f99Bdb0985aC8c5E7819f3e89dccA7C8A4C06a',
} as const;

export const registryAbi = [
  { type: 'function', name: 'register', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'string' }, { type: 'string' }], outputs: [] },
  { type: 'function', name: 'exists', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getPayoutAddress', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'getCreator', stateMutability: 'view', inputs: [{ type: 'string' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'payoutAddress', type: 'address' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'displayName', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'verified', type: 'bool' },
    ]}],
  },
  { type: 'function', name: 'getUsernamesByAddress', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
  { type: 'function', name: 'getNameByHash', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'string' }] },
] as const;

// Extended ABIs for full dashboard functionality

export const tipJarFullAbi = [
  { type: 'function', name: 'getLifetimeReceived', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getTipsByCreator', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'getTipsByFan', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'getTip', stateMutability: 'view', inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'from', type: 'address' }, { name: 'usernameHash', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' },
      { name: 'message', type: 'string' },
    ]}],
  },
  { type: 'event', name: 'TipSent',
    inputs: [
      { type: 'uint256', name: 'tipId', indexed: true },
      { type: 'bytes32', name: 'usernameHash', indexed: true },
      { type: 'address', name: 'from', indexed: true },
      { type: 'uint256', name: 'netAmount', indexed: false },
      { type: 'uint256', name: 'protocolFee', indexed: false },
      { type: 'string', name: 'message', indexed: false },
    ] },
] as const;

export const subscriptionsEventsAbi = [
  { type: 'event', name: 'Subscribed',
    inputs: [
      { type: 'uint256', name: 'subId', indexed: true },
      { type: 'uint256', name: 'planId', indexed: true },
      { type: 'address', name: 'subscriber', indexed: true },
      { type: 'uint256', name: 'months', indexed: false },
      { type: 'uint256', name: 'amount', indexed: false },
    ] },
] as const;

export const contentPaywallEventsAbi = [
  { type: 'event', name: 'AccessPurchased',
    inputs: [
      { type: 'bytes32', name: 'contentId', indexed: true },
      { type: 'address', name: 'buyer', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
    ] },
] as const;

export const payPerCallEventsAbi = [
  { type: 'event', name: 'Paid',
    inputs: [
      { type: 'uint256', name: 'callId', indexed: true },
      { type: 'bytes32', name: 'endpointId', indexed: true },
      { type: 'address', name: 'payer', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
    ] },
] as const;

export const subscriptionsFullAbi = [
  { type: 'function', name: 'createPlan', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'string' }, { type: 'uint256' }, { type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'updatePlan', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }, { type: 'bool' }, { type: 'uint256' }, { type: 'string' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ type: 'string' }], outputs: [] },
  { type: 'function', name: 'claimableRevenue', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getPlan', stateMutability: 'view', inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'creatorHash', type: 'bytes32' }, { name: 'name', type: 'string' },
      { name: 'pricePerMonth', type: 'uint256' }, { name: 'metadataURI', type: 'string' },
      { name: 'active', type: 'bool' },
    ]}],
  },
  { type: 'function', name: 'getPlanSubscribers', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256[]' }] },
] as const;

export const contentPaywallFullAbi = [
  { type: 'function', name: 'createContent', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'string' }], outputs: [] },
  { type: 'function', name: 'updateContent', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'bytes32' }, { type: 'bool' }, { type: 'uint256' }, { type: 'string' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ type: 'string' }], outputs: [] },
  { type: 'function', name: 'claimableRevenue', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getCreatorContents', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] },
  { type: 'function', name: 'getContent', stateMutability: 'view', inputs: [{ type: 'bytes32' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'contentId', type: 'bytes32' }, { name: 'creatorHash', type: 'bytes32' },
      { name: 'price', type: 'uint256' }, { name: 'metadataURI', type: 'string' },
      { name: 'active', type: 'bool' }, { name: 'totalSales', type: 'uint256' },
      { name: 'totalRevenue', type: 'uint256' },
    ]}],
  },
] as const;

export const payPerCallFullAbi = [
  { type: 'function', name: 'registerEndpoint', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'string' }, { type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'updateEndpoint', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'string' }, { type: 'bool' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ type: 'string' }], outputs: [] },
  { type: 'function', name: 'claimableRevenue', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getCreatorEndpoints', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] },
  { type: 'function', name: 'getEndpoint', stateMutability: 'view', inputs: [{ type: 'bytes32' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'creatorHash', type: 'bytes32' }, { name: 'name', type: 'string' },
      { name: 'pricePerCall', type: 'uint256' }, { name: 'active', type: 'bool' },
      { name: 'totalCalls', type: 'uint256' }, { name: 'totalRevenue', type: 'uint256' },
    ]}],
  },
  { type: 'function', name: 'getEndpointByName', stateMutability: 'view', inputs: [{ type: 'string' }, { type: 'string' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'creatorHash', type: 'bytes32' }, { name: 'name', type: 'string' },
      { name: 'pricePerCall', type: 'uint256' }, { name: 'active', type: 'bool' },
      { name: 'totalCalls', type: 'uint256' }, { name: 'totalRevenue', type: 'uint256' },
    ]}],
  },
] as const;

export const tipJarAbi = [
  { type: 'function', name: 'getLifetimeReceived', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getTipsByCreator', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'getTip', stateMutability: 'view', inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'from', type: 'address' }, { name: 'usernameHash', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' },
      { name: 'message', type: 'string' },
    ]}],
  },
] as const;

export const subscriptionsAbi = [
  { type: 'function', name: 'createPlan', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'string' }, { type: 'uint256' }, { type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'claimableRevenue', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ type: 'string' }], outputs: [] },
] as const;

export const payPerCallAbi = [
  { type: 'function', name: 'registerEndpoint', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'string' }, { type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'claimableRevenue', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getCreatorEndpoints', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] },
  { type: 'function', name: 'getEndpointByName', stateMutability: 'view', inputs: [{ type: 'string' }, { type: 'string' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'creatorHash', type: 'bytes32' }, { name: 'name', type: 'string' },
      { name: 'pricePerCall', type: 'uint256' }, { name: 'active', type: 'bool' },
      { name: 'totalCalls', type: 'uint256' }, { name: 'totalRevenue', type: 'uint256' },
    ]}],
  },
] as const;

export const contentPaywallAbi = [
  { type: 'function', name: 'createContent', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'string' }], outputs: [] },
  { type: 'function', name: 'getCreatorContents', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] },
  { type: 'function', name: 'claimableRevenue', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
] as const;
