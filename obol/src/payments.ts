// Payment primitives for Obol, on top of ArcPay's PayPerCall.
//
// Key facts about the deployed contract (see contracts/src/PayPerCall.sol):
//  - pay(endpointId) is payable; msg.value MUST equal endpoint.pricePerCall (native USDC on Arc).
//  - pay() returns callId on-chain, but a tx can't return values off-chain — we read the
//    callId from the emitted Paid(callId, endpointId, payer, amount) event.
//  - CallReceipt has NO "consumed" flag {callId, endpointId, payer, amount, timestamp}, so a
//    receipt alone can't prevent replay — the SELLER tracks served callIds (see seller.ts).

import { parseEventLogs, type Log } from "viem";
import { payPerCallAbi } from "./abi.ts";
import { publicClient, walletFor, payPerCallAddress, type NetworkName } from "./chain.ts";

export type CallReceipt = {
  callId: bigint;
  endpointId: `0x${string}`;
  payer: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
};

/** Extract the callId from a tx's logs by finding the PayPerCall `Paid` event. */
export function parseCallIdFromLogs(logs: Log[]): bigint {
  const events = parseEventLogs({ abi: payPerCallAbi, eventName: "Paid", logs });
  if (events.length === 0) throw new Error("no Paid event found in transaction logs");
  return (events[0] as unknown as { args: { callId: bigint } }).args.callId;
}

/**
 * Pure check that a receipt authorizes a given (endpoint, payer).
 * Replay protection is the seller's job (CallReceipt has no consumed flag) — see seller.ts.
 */
export function verifyReceipt(
  r: CallReceipt,
  expect: { endpointId: string; expectedPayer: string },
): boolean {
  return (
    r.endpointId.toLowerCase() === expect.endpointId.toLowerCase() &&
    r.payer.toLowerCase() === expect.expectedPayer.toLowerCase()
  );
}

/** Read a receipt from chain. */
export async function getReceipt(
  callId: bigint,
  network: NetworkName = "testnet",
): Promise<CallReceipt> {
  const raw = (await publicClient(network).readContract({
    address: payPerCallAddress(network),
    abi: payPerCallAbi,
    functionName: "getReceipt",
    args: [callId],
  })) as CallReceipt;
  return raw;
}

/** Read an endpoint's per-call price (native USDC wei). */
export async function getEndpointPrice(
  endpointId: `0x${string}`,
  network: NetworkName = "testnet",
): Promise<bigint> {
  const ep = (await publicClient(network).readContract({
    address: payPerCallAddress(network),
    abi: payPerCallAbi,
    functionName: "getEndpoint",
    args: [endpointId],
  })) as { pricePerCall: bigint; active: boolean };
  return ep.pricePerCall;
}

/** Pay an endpoint exactly its price; return the callId (from the Paid event) and tx hash. */
export async function payEndpoint(
  buyerPk: `0x${string}`,
  endpointId: `0x${string}`,
  network: NetworkName = "testnet",
): Promise<{ callId: bigint; txHash: `0x${string}` }> {
  const wallet = walletFor(buyerPk, network);
  const pub = publicClient(network);
  const price = await getEndpointPrice(endpointId, network);
  const txHash = await wallet.writeContract({
    address: payPerCallAddress(network),
    abi: payPerCallAbi,
    functionName: "pay",
    args: [endpointId],
    value: price,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  const callId = parseCallIdFromLogs(receipt.logs);
  return { callId, txHash };
}
