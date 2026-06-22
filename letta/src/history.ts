// The buyer's on-chain payment history = the credit signal the agent reasons over.
// We read ArcPay PayPerCall `Paid` events where the buyer was the payer, and distill
// honest features: how much they've paid, how often, how recently, how diversified.
//
// Note: PayPerCall has no due dates, so we do NOT fabricate a "punctuality" score. The
// signal here is real economic activity (count / volume / recency / counterparty spread),
// which is exactly what a thin-file underwriter leans on. The agent is told this is the
// only signal and reasons accordingly.

import { publicClient } from "./chain.ts";
import { ADDRESSES } from "./config.ts";
import { payPerCallPaidAbi } from "./abi.ts";

export type PaidEvent = { amount: bigint; endpointId: `0x${string}`; blockNumber: bigint };

export type CreditFeatures = {
  hasHistory: boolean;
  paymentCount: number;
  totalVolumeWei: bigint;
  avgPaymentWei: bigint;
  distinctEndpoints: number;
  concentration: number; // 0..1 share of payments to the single most-used endpoint (higher = riskier)
  lastBlock: bigint;
  blocksSinceLast: bigint; // recency
};

/** Pure: distill credit features from a buyer's Paid events. Offline-testable. */
export function summarizeHistory(events: PaidEvent[], currentBlock: bigint): CreditFeatures {
  if (events.length === 0) {
    return {
      hasHistory: false,
      paymentCount: 0,
      totalVolumeWei: 0n,
      avgPaymentWei: 0n,
      distinctEndpoints: 0,
      concentration: 0,
      lastBlock: 0n,
      blocksSinceLast: 0n,
    };
  }
  const count = events.length;
  let total = 0n;
  let last = 0n;
  const byEndpoint = new Map<string, number>();
  for (const e of events) {
    total += e.amount;
    if (e.blockNumber > last) last = e.blockNumber;
    byEndpoint.set(e.endpointId, (byEndpoint.get(e.endpointId) ?? 0) + 1);
  }
  const maxShare = Math.max(...byEndpoint.values());
  return {
    hasHistory: true,
    paymentCount: count,
    totalVolumeWei: total,
    avgPaymentWei: total / BigInt(count),
    distinctEndpoints: byEndpoint.size,
    concentration: maxShare / count,
    lastBlock: last,
    blocksSinceLast: currentBlock > last ? currentBlock - last : 0n,
  };
}

/** Live: fetch the buyer's PayPerCall payment history from Arc testnet and summarize it.
 *  Arc's RPC caps eth_getLogs to a 10k-block range, so we scan a recent window. */
export async function fetchBuyerHistory(
  buyer: `0x${string}`,
  opts: { lookbackBlocks?: bigint } = {},
): Promise<{ features: CreditFeatures; events: PaidEvent[]; currentBlock: bigint }> {
  const client = publicClient();
  const currentBlock = await client.getBlockNumber();
  const lookback = opts.lookbackBlocks ?? 9000n;
  const fromBlock = currentBlock > lookback ? currentBlock - lookback : 0n;
  const logs = await client.getLogs({
    address: ADDRESSES.payPerCall,
    event: payPerCallPaidAbi[0],
    args: { payer: buyer },
    fromBlock,
    toBlock: currentBlock,
  });
  const events: PaidEvent[] = logs.map((l) => ({
    amount: l.args.amount as bigint,
    endpointId: l.args.endpointId as `0x${string}`,
    blockNumber: l.blockNumber as bigint,
  }));
  return { features: summarizeHistory(events, currentBlock), events, currentBlock };
}
