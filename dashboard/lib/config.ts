import { defineChain } from 'viem';
import { DEPLOYMENTS } from './addresses.generated';

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'local') as 'local' | 'testnet';

export const arcLocal = defineChain({
  id: DEPLOYMENTS.local.chainId,
  name: DEPLOYMENTS.local.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [DEPLOYMENTS.local.rpc] } },
  testnet: true,
});

export const arcTestnet = defineChain({
  id: DEPLOYMENTS.testnet.chainId,
  name: DEPLOYMENTS.testnet.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [DEPLOYMENTS.testnet.rpc] } },
  testnet: true,
});

export const CHAIN = NETWORK === 'testnet' ? arcTestnet : arcLocal;

// Addresses come from contracts/deployments/current.json via sync script.
// Never hand-edit — run `node scripts/sync-addresses.mjs` after redeploy.
export const ADDRESSES = DEPLOYMENTS[NETWORK].addresses;

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
