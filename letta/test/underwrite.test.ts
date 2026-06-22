import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deterministicUnderwrite,
  decisionFromPct,
  parseUnderwriteResponse,
  type Invoice,
} from "../src/underwrite.ts";
import type { CreditFeatures } from "../src/history.ts";

const INVOICE: Invoice = {
  invoiceId: "INV-001",
  supplier: "0x0000000000000000000000000000000000000051" as `0x${string}`,
  buyer: "0x00000000000000000000000000000000000000B0" as `0x${string}`,
  faceValueWei: 1_000_000n,
  dueInDays: 60,
  description: "widgets",
};

const NO_HISTORY: CreditFeatures = {
  hasHistory: false,
  paymentCount: 0,
  totalVolumeWei: 0n,
  avgPaymentWei: 0n,
  distinctEndpoints: 0,
  concentration: 0,
  lastBlock: 0n,
  blocksSinceLast: 0n,
};

const STRONG: CreditFeatures = {
  hasHistory: true,
  paymentCount: 6,
  totalVolumeWei: 1000n,
  avgPaymentWei: 166n,
  distinctEndpoints: 3,
  concentration: 0.4,
  lastBlock: 100n,
  blocksSinceLast: 10n,
};

test("thin file → conservative 70/4.5", () => {
  const d = deterministicUnderwrite(INVOICE, NO_HISTORY);
  assert.equal(d.advancePct, 70);
  assert.equal(d.discountRatePct, 4.5);
  assert.equal(d.advanceWei, 700_000n); // 70% of 1e6
  assert.equal(d.feeWei, 45_000n); // 4.5%
  assert.equal(d.source, "fallback");
  assert.ok(d.reasoning.toLowerCase().includes("history"));
});

test("strong recent history → max advance 90, min discount 1.5", () => {
  const d = deterministicUnderwrite(INVOICE, STRONG);
  assert.equal(d.advancePct, 90);
  assert.equal(d.discountRatePct, 1.5);
  assert.equal(d.advanceWei, 900_000n);
  assert.equal(d.feeWei, 15_000n);
});

test("invariant: advance > 0 and advance + fee <= face, even at extremes", () => {
  for (const [a, dr] of [
    [95, 8],
    [99, 9],
    [50, 0.1],
    [0, 0],
  ] as const) {
    const d = decisionFromPct(1000n, a, dr, "x", "fallback");
    assert.ok(d.advanceWei > 0n, `advance>0 for ${a}/${dr}`);
    assert.ok(d.advanceWei + d.feeWei <= 1000n, `advance+fee<=face for ${a}/${dr}`);
  }
});

test("parse: valid JSON → decision", () => {
  const d = parseUnderwriteResponse('{"approve":true,"advancePct":85,"discountRatePct":2.5,"reasoning":"ok"}', 1_000_000n);
  assert.ok(d);
  assert.equal(d!.advancePct, 85);
  assert.equal(d!.advanceWei, 850_000n);
  assert.equal(d!.source, "llm");
});

test("parse: fenced JSON → decision", () => {
  const d = parseUnderwriteResponse('```json\n{"advancePct":80,"discountRatePct":3,"reasoning":"r"}\n```', 1_000_000n);
  assert.ok(d);
  assert.equal(d!.advancePct, 80);
});

test("parse: out-of-range pct gets clamped", () => {
  const d = parseUnderwriteResponse('{"advancePct":140,"discountRatePct":0.01,"reasoning":"r"}', 1_000_000n);
  assert.ok(d);
  assert.equal(d!.advancePct, 95); // clamped to max
  assert.equal(d!.discountRatePct, 0.5); // clamped to min
});

test("parse: garbage → null (triggers fallback upstream)", () => {
  assert.equal(parseUnderwriteResponse("not json at all", 1_000_000n), null);
  assert.equal(parseUnderwriteResponse('{"approve":true}', 1_000_000n), null); // no pct
});
