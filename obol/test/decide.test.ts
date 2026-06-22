import { test } from "node:test";
import assert from "node:assert/strict";
import { affordable, type Service } from "../src/catalog.ts";
import { deterministicChooser, type AgentState } from "../src/decide.ts";

const svc = (name: string, capability: string, priceWei: bigint): Service => ({
  name,
  capability,
  endpointId: ("0x" + "00".repeat(32)) as `0x${string}`,
  priceWei,
  sellerUrl: `http://localhost/${name}`,
});

const state = (over: Partial<AgentState> = {}): AgentState => ({
  goal: "summarize this url",
  budgetWei: 1000n,
  spentWei: 0n,
  history: [],
  ...over,
});

test("affordable filters out services above remaining budget", () => {
  const cat = [svc("a", "x", 100n), svc("b", "y", 500n), svc("c", "z", 2000n)];
  const out = affordable(cat, 600n).map((s) => s.name);
  assert.deepEqual(out, ["a", "b"]);
});

test("deterministicChooser picks the best capability match within budget", async () => {
  const cat = [
    svc("classify", "sentiment classification of text", 100n),
    svc("summarize", "fetch a url and summarize it", 200n),
  ];
  const d = await deterministicChooser().decide(state(), cat);
  assert.equal(d.action, "call");
  assert.equal(d.action === "call" && d.service.name, "summarize");
});

test("deterministicChooser breaks ties by lowest price", async () => {
  const cat = [
    svc("sum-a", "summarize url", 300n),
    svc("sum-b", "summarize url", 100n),
  ];
  const d = await deterministicChooser().decide(state(), cat);
  assert.equal(d.action === "call" && d.service.name, "sum-b");
});

test("deterministicChooser skips already-used services", async () => {
  const cat = [svc("summarize", "summarize url", 100n)];
  const d = await deterministicChooser().decide(
    state({ history: [{ service: "summarize", input: {}, result: {}, costWei: 100n }] }),
    cat,
  );
  assert.equal(d.action, "stop");
});

test("deterministicChooser stops when nothing is affordable", async () => {
  const cat = [svc("summarize", "summarize url", 5000n)];
  const d = await deterministicChooser().decide(state({ budgetWei: 100n }), cat);
  assert.equal(d.action, "stop");
});

test("deterministicChooser stops when no affordable service matches the goal", async () => {
  const cat = [svc("weather", "current weather forecast", 10n)];
  const d = await deterministicChooser().decide(state({ goal: "summarize this url" }), cat);
  assert.equal(d.action, "stop");
});
