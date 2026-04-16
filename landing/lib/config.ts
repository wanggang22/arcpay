import { defineChain } from 'viem';

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'local') as 'local' | 'testnet';

export const arcLocal = defineChain({
  id: 1337, name: 'Arc Local',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
  testnet: true,
});
export const arcTestnet = defineChain({
  id: 5042002, name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  testnet: true,
});

export const CHAIN = NETWORK === 'testnet' ? arcTestnet : arcLocal;

export const ADDRESSES = NETWORK === 'testnet' ? {
  registry:        '0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb',
  tipJar:          '0x45daE58fB5b89C4E994216D2af0B73232641DF3B',
  subscriptions:   '0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380',
  contentPaywall:  '0x680884124F21939548Ba7f982B4F275A55783484',
  payPerCall:      '0x3a399A310965A5cbD5a2B9F21a3B9885B6372def',
  tipJarByHandle:  '0x291b86d46027f734cF43Eca9BA2394F46dcd529C',
} as const : {
  registry:        '0xD85677eBC8b242E5110C69f1d1f134389319632C',
  tipJar:          '0xC627bf4D1f21dcc82Ef563191f63723CD290959f',
  subscriptions:   '0x0D4e458145A8eE377FD90295dd3332ee5BC90aE4',
  contentPaywall:  '0x352fc9770F1c72c0B91d7D62946EDa67A6288A95',
  payPerCall:      '0xc6f99Bdb0985aC8c5E7819f3e89dccA7C8A4C06a',
  tipJarByHandle:  '0x0000000000000000000000000000000000000000',
} as const;

export const registryAbi = [
  { type: 'function', name: 'exists', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getCreator', stateMutability: 'view', inputs: [{ type: 'string' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'payoutAddress', type: 'address' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'displayName', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'verified', type: 'bool' },
    ]}],
  },
] as const;

export const tipJarAbi = [
  { type: 'function', name: 'tip', stateMutability: 'payable', inputs: [{ type: 'string' }, { type: 'string' }], outputs: [] },
  { type: 'function', name: 'getLifetimeReceived', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'protocolFeeBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getTipsByFan', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256[]' }] },
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
  { type: 'function', name: 'subscribe', stateMutability: 'payable', inputs: [{ type: 'uint256' }, { type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getPlan', stateMutability: 'view', inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'creatorHash', type: 'bytes32' }, { name: 'name', type: 'string' },
      { name: 'pricePerMonth', type: 'uint256' }, { name: 'metadataURI', type: 'string' },
      { name: 'active', type: 'bool' },
    ]}],
  },
  { type: 'function', name: 'activeSubOf', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getSubscription', stateMutability: 'view', inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'planId', type: 'uint256' }, { name: 'subscriber', type: 'address' },
      { name: 'startedAt', type: 'uint256' }, { name: 'paidUntil', type: 'uint256' },
      { name: 'depositedAmount', type: 'uint256' }, { name: 'consumedAmount', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ]}],
  },
] as const;

export const contentPaywallAbi = [
  { type: 'function', name: 'purchase', stateMutability: 'payable', inputs: [{ type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'getContent', stateMutability: 'view', inputs: [{ type: 'bytes32' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'contentId', type: 'bytes32' }, { name: 'creatorHash', type: 'bytes32' },
      { name: 'price', type: 'uint256' }, { name: 'metadataURI', type: 'string' },
      { name: 'active', type: 'bool' }, { name: 'totalSales', type: 'uint256' },
      { name: 'totalRevenue', type: 'uint256' },
    ]}],
  },
  { type: 'function', name: 'checkAccess', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getCreatorContents', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] },
] as const;

export const tipJarByHandleAbi = [
  { type: 'function', name: 'tipByHandle', stateMutability: 'payable', inputs: [{ type: 'string' }, { type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'claimByHandle', stateMutability: 'nonpayable',
    inputs: [{ type: 'string' }, { type: 'address' }, { type: 'uint256' }, { type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'availableToClaim', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getTipsByHandle', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'getTip', stateMutability: 'view', inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'handleHash', type: 'bytes32' }, { name: 'from', type: 'address' },
      { name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' },
      { name: 'message', type: 'string' },
    ]}],
  },
  { type: 'function', name: 'protocolFeeBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'attestationSigner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'event', name: 'TipByHandle',
    inputs: [
      { type: 'uint256', name: 'tipId', indexed: true },
      { type: 'bytes32', name: 'handleHash', indexed: true },
      { type: 'address', name: 'from', indexed: true },
      { type: 'uint256', name: 'netAmount', indexed: false },
      { type: 'uint256', name: 'protocolFee', indexed: false },
      { type: 'string',  name: 'message', indexed: false },
      { type: 'string',  name: 'handlePlain', indexed: false },
    ] },
  { type: 'event', name: 'TipClaimed',
    inputs: [
      { type: 'bytes32', name: 'handleHash', indexed: true },
      { type: 'address', name: 'recipient', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
    ] },
] as const;

export const payPerCallAbi = [
  { type: 'function', name: 'pay', stateMutability: 'payable', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'batchPay', stateMutability: 'payable', inputs: [{ type: 'bytes32' }, { type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getCreatorEndpoints', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] },
  { type: 'function', name: 'getEndpoint', stateMutability: 'view', inputs: [{ type: 'bytes32' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'creatorHash', type: 'bytes32' }, { name: 'name', type: 'string' },
      { name: 'pricePerCall', type: 'uint256' }, { name: 'active', type: 'bool' },
      { name: 'totalCalls', type: 'uint256' }, { name: 'totalRevenue', type: 'uint256' },
    ]}],
  },
] as const;
