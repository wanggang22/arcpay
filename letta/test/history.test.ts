import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeHistory, type PaidEvent } from "../src/history.ts";

const ep = (s: string) => s as `0x${string}`;

test("empty history → no signal", () => {
  const f = summarizeHistory([], 100n);
  assert.equal(f.hasHistory, false);
  assert.equal(f.paymentCount, 0);
  assert.equal(f.totalVolumeWei, 0n);
});

test("summarizes count, volume, average, recency, concentration", () => {
  const events: PaidEvent[] = [
    { amount: 100n, endpointId: ep("0xaaa"), blockNumber: 10n },
    { amount: 300n, endpointId: ep("0xaaa"), blockNumber: 20n },
    { amount: 200n, endpointId: ep("0xbbb"), blockNumber: 30n },
  ];
  const f = summarizeHistory(events, 50n);
  assert.equal(f.hasHistory, true);
  assert.equal(f.paymentCount, 3);
  assert.equal(f.totalVolumeWei, 600n);
  assert.equal(f.avgPaymentWei, 200n);
  assert.equal(f.distinctEndpoints, 2);
  assert.equal(f.lastBlock, 30n);
  assert.equal(f.blocksSinceLast, 20n);
  assert.ok(Math.abs(f.concentration - 2 / 3) < 1e-9, "2 of 3 payments to one endpoint");
});

test("single concentrated payer → concentration 1", () => {
  const events: PaidEvent[] = [
    { amount: 50n, endpointId: ep("0xaaa"), blockNumber: 5n },
    { amount: 50n, endpointId: ep("0xaaa"), blockNumber: 6n },
  ];
  const f = summarizeHistory(events, 6n);
  assert.equal(f.concentration, 1);
  assert.equal(f.blocksSinceLast, 0n);
});
