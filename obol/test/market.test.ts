// Offline integration: the whole agent loop wired together — brain (deterministic)
// + discovery-shaped catalog + the 3 real services via directExecute — with no chain
// and no LLM. Proves the pieces fit and the agent autonomously buys useful work.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Catalog } from "../src/catalog.ts";
import { runBuyer } from "../src/agent.ts";
import { deterministicChooser } from "../src/decide.ts";
import { SELLER_SPECS, directExecute } from "../src/sellers.ts";

const catalog: Catalog = SELLER_SPECS.map((s, i) => ({
  name: s.name,
  capability: s.capability,
  endpointId: ("0x" + String(i).repeat(64)).slice(0, 66) as `0x${string}`,
  priceWei: s.priceWei,
  sellerUrl: `http://localhost/${s.name}`,
}));

test("agent autonomously buys the sentiment service for a classification goal", async () => {
  const state = await runBuyer({
    goal: "classify the sentiment of this text",
    budgetWei: 1000n,
    catalog,
    chooser: deterministicChooser(),
    execute: directExecute(),
  });
  const names = state.history.map((h) => h.service);
  assert.ok(names.includes("classify"), `expected classify to be used, got ${names.join(",")}`);
  assert.ok(state.spentWei > 0n && state.spentWei <= 1000n);
});

test("agent stays within budget across multiple buys", async () => {
  // budget only affords the two cheapest (classify 50 + price-lookup 80 = 130)
  const state = await runBuyer({
    goal: "classify sentiment and price lookup for a token",
    budgetWei: 140n,
    catalog,
    chooser: deterministicChooser(),
    execute: directExecute(),
  });
  assert.ok(state.spentWei <= 140n, `overspent: ${state.spentWei}`);
  // summarize (200) must not have been bought — unaffordable within remaining budget
  assert.ok(!state.history.some((h) => h.service === "summarize"));
});

test("directExecute returns real service results", async () => {
  const state = await runBuyer({
    goal: "classify the sentiment of this great amazing text",
    budgetWei: 1000n,
    catalog,
    chooser: deterministicChooser(),
    execute: directExecute(),
  });
  const classifyCall = state.history.find((h) => h.service === "classify");
  assert.ok(classifyCall, "classify should have run");
  assert.equal((classifyCall!.result as { label: string }).label, "positive");
});
