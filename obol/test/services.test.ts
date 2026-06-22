import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, classify, priceLookup, staticPriceSource } from "../src/services.ts";

test("summarize returns the first N sentences of given text", async () => {
  const out = await summarize({ text: "One. Two. Three. Four.", maxSentences: 2 });
  assert.equal(out.summary, "One. Two.");
  assert.ok(out.sourceChars > 0);
});

test("summarize fetches a url and strips html", async () => {
  const fakeFetch = (async () =>
    new Response("<html><body>Hello world. Second sentence.</body></html>")) as unknown as typeof fetch;
  const out = await summarize({ url: "http://x", maxSentences: 1 }, fakeFetch);
  assert.equal(out.summary, "Hello world.");
});

test("classify scores sentiment by lexicon", () => {
  assert.equal(classify({ text: "this is great and amazing" }).label, "positive");
  assert.equal(classify({ text: "terrible awful scam" }).label, "negative");
  assert.equal(classify({ text: "a plain neutral sentence" }).label, "neutral");
});

test("priceLookup uses the static source and uppercases the symbol", async () => {
  const out = await priceLookup({ symbol: "eth" }, staticPriceSource);
  assert.equal(out.symbol, "ETH");
  assert.equal(out.priceUsd, 3200);
});

test("priceLookup returns null for an unknown symbol", async () => {
  const out = await priceLookup({ symbol: "ZZZ" }, staticPriceSource);
  assert.equal(out.priceUsd, null);
});

test("priceLookup honors an injected source", async () => {
  const out = await priceLookup({ symbol: "arc" }, async () => 42);
  assert.equal(out.priceUsd, 42);
});
