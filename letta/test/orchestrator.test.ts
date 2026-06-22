import { test } from "node:test";
import assert from "node:assert/strict";
import { repayProgress, reassess } from "../src/orchestrator.ts";
import type { OnchainInvoice } from "../src/pool.ts";

const base = (over: Partial<OnchainInvoice>): OnchainInvoice => ({
  supplier: "0x0000000000000000000000000000000000000051" as `0x${string}`,
  buyer: "0x00000000000000000000000000000000000000B0" as `0x${string}`,
  faceValue: 100n,
  advance: 88n,
  fee: 5n, // target = 93
  collected: 0n,
  factorPaid: 0n,
  supplierPaid: 0n,
  funded: true,
  settled: false,
  ...over,
});

test("just funded → full exposure, 0% collected", () => {
  const p = repayProgress(base({}));
  assert.equal(p.collectedPct, 0);
  assert.equal(p.factorExposureWei, 93n);
  assert.equal(p.remainingOwedWei, 100n);
  assert.equal(p.factorWhole, false);
});

test("partial → exposure shrinks, memo re-rates", () => {
  const inv = base({ collected: 50n, factorPaid: 50n });
  const { progress, memo } = reassess(inv);
  assert.equal(progress.collectedPct, 50);
  assert.equal(progress.factorExposureWei, 43n);
  assert.equal(progress.factorWhole, false);
  assert.ok(/partial/i.test(memo) && /43/.test(memo));
});

test("factor whole but not settled → zero exposure memo", () => {
  const inv = base({ collected: 93n, factorPaid: 93n });
  const { progress, memo } = reassess(inv);
  assert.equal(progress.factorWhole, true);
  assert.equal(progress.factorExposureWei, 0n);
  assert.equal(progress.settled, false);
  assert.ok(/zero/i.test(memo));
});

test("settled → closed position memo", () => {
  const inv = base({ collected: 100n, factorPaid: 93n, supplierPaid: 7n, settled: true });
  const { progress, memo } = reassess(inv);
  assert.equal(progress.settled, true);
  assert.equal(progress.remainingOwedWei, 0n);
  assert.ok(/settled in full/i.test(memo));
});
