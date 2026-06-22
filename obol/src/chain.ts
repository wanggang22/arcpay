// Chain config + viem clients for Obol.
// Reads ArcPay's canonical deployment file (contracts/deployments/current.json),
// shape: { networks: { testnet|local: { chainId, rpc, addresses: { payPerCall, ... } } } }.
// Default network is "testnet" — Obol settles real test-USDC on Arc testnet
// (no local anvil in this environment; the deployed PayPerCall is the rail).

import { createPublicClient, createWalletClient, http, defineChain, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

export type NetworkName = "testnet" | "local";

type Deployments = {
  networks: Record<
    string,
    { name: string; chainId: number; rpc: string; addresses: Record<string, `0x${string}`> }
  >;
};

function deployments(): Deployments {
  const url = new URL("../../contracts/deployments/current.json", import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as Deployments;
}

export function networkConfig(network: NetworkName = "testnet") {
  const net = deployments().networks[network];
  if (!net) throw new Error(`network "${network}" not found in deployments/current.json`);
  return net;
}

export function payPerCallAddress(network: NetworkName = "testnet"): `0x${string}` {
  const addr = networkConfig(network).addresses.payPerCall;
  if (!addr) throw new Error(`payPerCall address missing for network "${network}"`);
  return addr;
}

export function arcChain(network: NetworkName = "testnet"): Chain {
  const net = networkConfig(network);
  return defineChain({
    id: net.chainId,
    name: net.name,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, // Arc: native USDC gas, 18-decimal wei
    rpcUrls: { default: { http: [process.env.RPC ?? net.rpc] } },
  });
}

export function publicClient(network: NetworkName = "testnet") {
  return createPublicClient({ chain: arcChain(network), transport: http() });
}

export function walletFor(pk: `0x${string}`, network: NetworkName = "testnet") {
  return createWalletClient({
    account: privateKeyToAccount(pk),
    chain: arcChain(network),
    transport: http(),
  });
}
