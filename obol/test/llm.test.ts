import { test } from "node:test";
import assert from "node:assert/strict";
import type { Service, Catalog } from "../src/catalog.ts";
import { parseDecision, llmChooser } from "../src/llm.ts";
import type { AgentState } from "../src/decide.ts";

const svc = (name: string, capability: string, priceWei: bigint): Service => ({
  name,
  capability,
  endpointId: ("0x" + "00".repeat(32)) as `0x${string}`,
  priceWei,
  sellerUrl: `http://localhost/${name}`,
});

const cat: Catalog = [
  svc("summarize", "fetch a url and summarize it", 100n),
  svc("classify", "sentiment classification", 50n),
];

test("parseDecision parses a plain call JSON and maps to the service", () => {
  const d = parseDecision('{"action":"call","service":"summarize","input":{"url":"x"},"reason":"r"}', cat);
  assert.equal(d?.action, "call");
  assert.equal(d?.action === "call" && d.service.name, "summarize");
});

test("parseDecision strips ```json fences", () => {
  const d = parseDecision('```json\n{"action":"stop","reason":"done"}\n```', cat);
  assert.equal(d?.action, "stop");
});

test("parseDecision returns null on malformed JSON", () => {
  assert.equal(parseDecision("not json at all", cat), null);
});

test("parseDecision returns null for an unknown/hallucinated service", () => {
  const d = parseDecision('{"action":"call","service":"does-not-exist","input":{},"reason":"r"}', cat);
  assert.equal(d, null);
});

test("llmChooser with no API key falls back to the deterministic policy", async () => {
  const state: AgentState = { goal: "summarize this url", budgetWei: 1000n, spentWei: 0n, history: [] };
  const d = await llmChooser({ apiKey: "" }).decide(state, cat);
  // deterministic should choose the capability match "summarize"
  assert.equal(d.action, "call");
  assert.equal(d.action === "call" && d.service.name, "summarize");
});

// Live check against the real API; only runs with LLM_LIVE=1 (needs ANTHROPIC_API_KEY).
test("llmChooser (live) returns a valid decision", { skip: process.env.LLM_LIVE !== "1" }, async () => {
  const state: AgentState = { goal: "classify the sentiment of a tweet", budgetWei: 1000n, spentWei: 0n, history: [] };
  const d = await llmChooser().decide(state, cat);
  assert.ok(d.action === "call" || d.action === "stop");
  if (d.action === "call") assert.ok(cat.some((s) => s.name === d.service.name));
});
