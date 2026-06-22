// Ties the brain to the chain: underwrite an invoice from on-chain history, fund it, and
// re-assess the factor's exposure on every (partial/late) repayment. The re-assessment is
// the demo's differentiator — the agent keeps reasoning about a live, changing position.

import { fetchBuyerHistory, type CreditFeatures } from "./history.ts";
import { underwrite, type Invoice, type UnderwriteDecision } from "./underwrite.ts";
import { fundInvoice, invoiceIdOf, type OnchainInvoice } from "./pool.ts";

export type FundResult = {
  invoiceId: `0x${string}`;
  features: CreditFeatures;
  decision: UnderwriteDecision;
  fundTx: `0x${string}`;
};

/** Read the buyer's on-chain history, underwrite the invoice, and fund it on Arc. */
export async function underwriteAndFund(args: {
  invoice: Invoice;
  factorPk: `0x${string}`;
  lookbackBlocks?: bigint;
  llm?: { apiKey?: string; model?: string };
}): Promise<FundResult> {
  const { features } = await fetchBuyerHistory(args.invoice.buyer, { lookbackBlocks: args.lookbackBlocks });
  const decision = await underwrite(args.invoice, features, args.llm ?? {});
  const invoiceId = invoiceIdOf(args.invoice.invoiceId);
  const { txHash } = await fundInvoice(args.factorPk, {
    invoiceId,
    supplier: args.invoice.supplier,
    buyer: args.invoice.buyer,
    faceValueWei: args.invoice.faceValueWei,
    advanceWei: decision.advanceWei,
    feeWei: decision.feeWei,
  });
  return { invoiceId, features, decision, fundTx: txHash };
}

export type RepayProgress = {
  collectedPct: number; // % of face value collected
  remainingOwedWei: bigint;
  factorExposureWei: bigint; // advance+fee still unrecovered by the factor
  factorWhole: boolean; // factor has recovered advance+fee
  settled: boolean;
};

/** Pure: where does the invoice stand after a repayment? Offline-testable. */
export function repayProgress(inv: OnchainInvoice): RepayProgress {
  const target = inv.advance + inv.fee;
  const factorExposureWei = target > inv.factorPaid ? target - inv.factorPaid : 0n;
  const remainingOwedWei = inv.faceValue > inv.collected ? inv.faceValue - inv.collected : 0n;
  const collectedPct = inv.faceValue === 0n ? 0 : Number((inv.collected * 10000n) / inv.faceValue) / 100;
  return {
    collectedPct,
    remainingOwedWei,
    factorExposureWei,
    factorWhole: inv.factorPaid >= target,
    settled: inv.settled,
  };
}

/** Pure: the agent's live re-assessment memo after a (partial) repayment. */
export function reassess(inv: OnchainInvoice): { progress: RepayProgress; memo: string } {
  const p = repayProgress(inv);
  let memo: string;
  if (p.settled) {
    memo = `Invoice settled in full (${inv.collected} wei collected). Factor recovered advance+fee; remaining surplus routed to the supplier. Position closed, zero residual exposure.`;
  } else if (p.factorWhole) {
    memo = `Buyer has paid ${p.collectedPct}% of face. The factor's advance+fee is now fully recovered — residual factor exposure is ZERO; any further collection is pure surplus to the supplier.`;
  } else {
    memo =
      `Partial payment observed: buyer paid ${p.collectedPct}% of face on this invoice. ` +
      `Factor exposure reduced to ${p.factorExposureWei} wei (was ${inv.advance + inv.fee}). ` +
      `On-chain payment behavior is now evidence: a buyer that services the invoice de-risks the remaining advance, so the position is re-rated lower without changing the agreed terms.`;
  }
  return { progress: p, memo };
}
