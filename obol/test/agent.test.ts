import { test } from "node:test";
import assert from "node:assert/strict";
import type { Service, Catalog } from "../src/catalog.ts";
import type { Chooser, Decision } from "../src/decide.ts";
import { runBuyer, type ExecuteCall } from "../src/agent.ts";

const svc = (name: string, priceWei: bigint): Service => ({
  name,
  capability: name,
  endpointId: ("0x" + "00".repeat(32)) as `0x${string}`,
  priceWei,
  sellerUrl: `http://localhost/${name}`,
});

// a chooser scripted with a fixed sequence of decisions
function scriptedChooser(seq: Decision[]): Chooser {
  let i = 0;
  return { async decide() { return seq[i++] ?? { action: "stop", reason: "exhausted" }; } };
}

const echoExecute: ExecuteCall = async (service, input) => ({
  result: { from: service.name, input },
  costWei: service.priceWei,
});

test("runBuyer records history and accumulates spend, then stops", async () => {
  const a = svc("a", 100n);
  const b = svc("b", 200n);
  const cat: Catalog = [a, b];
  const chooser = scriptedChooser([
    { action: "call", service: a, input: { q: 1 }, reason: "first" },
    { action: "call", service: b, input: { q: 2 }, reason: "second" },
    { action: "stop", reason: "done" },
  ]);

  const state = await runBuyer({ goal: "g", budgetWei: 1000n, catalog: cat, chooser, execute: echoExecute });

  assert.equal(state.history.length, 2);
  assert.equal(state.spentWei, 300n);
  assert.deepEqual(state.history.map((h) => h.service), ["a", "b"]);
  assert.deepEqual(state.history[0]!.result, { from: "a", input: { q: 1 } });
});

test("runBuyer refuses a call it cannot afford (budget guard)", async () => {
  const big = svc("big", 900n);
  const chooser = scriptedChooser([
    { action: "call", service: big, input: {}, reason: "first" }, // 900 ok
    { action: "call", service: big, input: {}, reason: "again" }, // would be 1800 > 1000 -> guarded
  ]);

  const state = await runBuyer({ goal: "g", budgetWei: 1000n, catalog: [big], chooser, execute: echoExecute });

  assert.equal(state.history.length, 1, "only the first affordable call should run");
  assert.equal(state.spentWei, 900n);
});

test("runBuyer respects maxSteps", async () => {
  const a = svc("a", 1n);
  // a chooser that always wants to call
  const chooser: Chooser = { async decide() { return { action: "call", service: a, input: {}, reason: "loop" }; } };

  const state = await runBuyer({ goal: "g", budgetWei: 10_000n, catalog: [a], chooser, execute: echoExecute, maxSteps: 3 });

  assert.equal(state.history.length, 3);
});

test("runBuyer stops immediately when chooser says stop", async () => {
  const chooser = scriptedChooser([{ action: "stop", reason: "nothing to do" }]);
  const state = await runBuyer({ goal: "g", budgetWei: 1000n, catalog: [], chooser, execute: echoExecute });
  assert.equal(state.history.length, 0);
  assert.equal(state.spentWei, 0n);
});
