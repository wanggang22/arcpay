// The underwriting brain. Given an invoice + the buyer's on-chain credit features,
// decide the advance % and discount rate (the factor's fee), with a written memo.
//
// Mirrors Obol's llm.ts pattern: Claude does the judgment; ANY failure (no key, API
// error, malformed/over-range output) falls back to a deterministic risk policy, so the
// agent never stalls and always produces a fundable decision.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CreditFeatures } from "./history.ts";

const DEFAULT_MODEL = process.env.LETTA_MODEL ?? "claude-sonnet-4-6";

export type Invoice = {
  invoiceId: string;
  supplier: `0x${string}`;
  buyer: `0x${string}`;
  faceValueWei: bigint;
  dueInDays: number;
  description?: string;
};

export type UnderwriteDecision = {
  approve: boolean;
  advanceWei: bigint;
  feeWei: bigint;
  advancePct: number; // % of face value advanced to the supplier now
  discountRatePct: number; // the factor's fee as % of face value
  reasoning: string;
  source: "llm" | "fallback";
};

export function loadApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const env = readFileSync(join(homedir(), ".claude-apis.env"), "utf8");
    const m = env.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1]!.trim().replace(/^["']|["']$/g, "");
  } catch {
    /* file may not exist */
  }
  return "";
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Turn an advance% + discount% into on-chain wei amounts, enforcing advance+fee <= face, advance > 0. */
export function decisionFromPct(
  faceValueWei: bigint,
  advancePct: number,
  discountRatePct: number,
  reasoning: string,
  source: "llm" | "fallback",
  approve = true,
): UnderwriteDecision {
  const a = clamp(advancePct, 50, 95);
  const d = clamp(discountRatePct, 0.5, 8);
  const advanceBps = BigInt(Math.round(a * 100));
  const feeBps = BigInt(Math.round(d * 100));
  let advanceWei = (faceValueWei * advanceBps) / 10000n;
  let feeWei = (faceValueWei * feeBps) / 10000n;
  if (advanceWei === 0n) advanceWei = 1n; // never zero — fundInvoice rejects advance==0
  if (advanceWei + feeWei > faceValueWei) feeWei = faceValueWei - advanceWei; // hard invariant for the contract
  return { approve, advanceWei, feeWei, advancePct: a, discountRatePct: d, reasoning, source };
}

/** Pure deterministic risk policy: prices by on-chain activity. Always fundable. */
export function deterministicUnderwrite(invoice: Invoice, features: CreditFeatures): UnderwriteDecision {
  if (!features.hasHistory) {
    return decisionFromPct(
      invoice.faceValueWei,
      70,
      4.5,
      "No on-chain payment history for this buyer — thin-file. Conservative 70% advance at a 4.5% discount to price the unknown counterparty risk.",
      "fallback",
    );
  }
  // activity in [0,1]: more prior payments => more trust
  const act = Math.min(features.paymentCount, 6) / 6;
  // recent activity nudges trust up a touch; stale history nudges it down
  const recent = features.blocksSinceLast < 5000n ? 1 : 0.6;
  const trust = act * recent;
  const advancePct = 78 + trust * 12; // 78..90
  const discountRatePct = 4 - trust * 2.5; // 4..1.5
  const reasoning =
    `Buyer has ${features.paymentCount} prior on-chain payment(s) totalling ${features.totalVolumeWei} wei across ` +
    `${features.distinctEndpoints} counterpart(ies); ${features.blocksSinceLast} blocks since last activity. ` +
    `Activity is ${act >= 0.8 ? "strong" : act >= 0.4 ? "moderate" : "light"}${recent < 1 ? " but stale" : ""}, ` +
    `so advance ${advancePct.toFixed(1)}% at a ${discountRatePct.toFixed(1)}% discount.`;
  return decisionFromPct(invoice.faceValueWei, advancePct, discountRatePct, reasoning, "fallback");
}

function buildPrompt(invoice: Invoice, features: CreditFeatures): string {
  return [
    `You are an autonomous invoice-factoring underwriter on Arc. You advance USDC to a supplier`,
    `against an unpaid invoice and recover it (plus a fee) when the buyer pays. Decide the advance`,
    `percentage and the discount rate (your fee), pricing the buyer's risk.`,
    ``,
    `INVOICE:`,
    `  face value (wei): ${invoice.faceValueWei.toString()}`,
    `  payment term (days): ${invoice.dueInDays}`,
    `  description: ${invoice.description ?? "n/a"}`,
    ``,
    `BUYER ON-CHAIN CREDIT SIGNAL (the only data you have — no due-date history exists, so reason`,
    `from economic activity, recency, and counterparty spread; treat a thin file conservatively):`,
    `  has history: ${features.hasHistory}`,
    `  prior payments: ${features.paymentCount}`,
    `  total volume (wei): ${features.totalVolumeWei.toString()}`,
    `  avg payment (wei): ${features.avgPaymentWei.toString()}`,
    `  distinct counterparties: ${features.distinctEndpoints}`,
    `  concentration (0-1, higher = relies on one party): ${features.concentration.toFixed(2)}`,
    `  blocks since last activity: ${features.blocksSinceLast.toString()}`,
    ``,
    `Reply with ONLY a JSON object, no prose, no markdown:`,
    `  {"approve": true, "advancePct": <50-95>, "discountRatePct": <0.5-8>, "reasoning": "<2-3 sentences citing the signal>"}`,
    `advancePct + discountRatePct must stay under 100. Higher trust => higher advance, lower discount.`,
  ].join("\n");
}

export function parseUnderwriteResponse(text: string, faceValueWei: bigint): UnderwriteDecision | null {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1]!.trim();
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const advancePct = Number(o.advancePct);
  const discountRatePct = Number(o.discountRatePct);
  if (!Number.isFinite(advancePct) || !Number.isFinite(discountRatePct)) return null;
  const approve = o.approve !== false;
  const reasoning = String(o.reasoning ?? "underwritten");
  return decisionFromPct(faceValueWei, advancePct, discountRatePct, reasoning, "llm", approve);
}

let warnedOnce = false;
function warnFallback(why: string) {
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn(`[letta] underwriting LLM unavailable (${why}); using the deterministic risk policy.`);
}

/** Decide the advance/fee for an invoice. Claude underwrites; deterministic policy backs it up. */
export async function underwrite(
  invoice: Invoice,
  features: CreditFeatures,
  opts: { apiKey?: string; model?: string } = {},
): Promise<UnderwriteDecision> {
  const apiKey = opts.apiKey ?? loadApiKey();
  const model = opts.model ?? DEFAULT_MODEL;
  if (!apiKey) {
    warnFallback("no ANTHROPIC_API_KEY");
    return deterministicUnderwrite(invoice, features);
  }
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: buildPrompt(invoice, features) }],
    });
    const txt = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const decision = parseUnderwriteResponse(txt, invoice.faceValueWei);
    if (!decision) {
      warnFallback("model returned unparseable output");
      return deterministicUnderwrite(invoice, features);
    }
    return decision;
  } catch (e) {
    warnFallback(String((e as { message?: string })?.message ?? e).slice(0, 80));
    return deterministicUnderwrite(invoice, features);
  }
}
