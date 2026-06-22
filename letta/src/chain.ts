// viem clients for Arc testnet (native USDC gas, 18-decimal wei).

import { createPublicClient, createWalletClient, http, defineChain, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET } from "./config.ts";

export function arcChain(): Chain {
  return defineChain({
    id: ARC_TESTNET.chainId,
    name: ARC_TESTNET.name,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [process.env.RPC ?? ARC_TESTNET.rpc] } },
  });
}

export function publicClient() {
  return createPublicClient({ chain: arcChain(), transport: http() });
}

export function walletFor(pk: `0x${string}`) {
  return createWalletClient({ account: privateKeyToAccount(pk), chain: arcChain(), transport: http() });
}
