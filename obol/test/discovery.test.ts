import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchDescriptor, discover } from "../src/discovery.ts";

const descriptor = (name: string, priceWei: string) =>
  JSON.stringify({
    name,
    capability: `${name} capability`,
    endpointId: "0x" + "ab".repeat(32),
    priceWei,
    network: "testnet",
  });

function fetchReturning(map: Record<string, string | number>): typeof fetch {
  return (async (url: string) => {
    const body = map[url];
    if (body === undefined) return new Response("", { status: 404 });
    if (typeof body === "number") return new Response("", { status: body });
    return new Response(body, { status: 200 });
  }) as unknown as typeof fetch;
}

test("fetchDescriptor parses a valid descriptor into a Service with bigint price", async () => {
  const f = fetchReturning({ "http://s1/.well-known/obol.json": descriptor("classify", "50") });
  const svc = await fetchDescriptor("http://s1", f);
  assert.ok(svc);
  assert.equal(svc!.name, "classify");
  assert.equal(svc!.priceWei, 50n);
  assert.equal(svc!.sellerUrl, "http://s1");
});

test("fetchDescriptor returns null on non-200", async () => {
  const f = fetchReturning({ "http://s1/.well-known/obol.json": 500 });
  assert.equal(await fetchDescriptor("http://s1", f), null);
});

test("fetchDescriptor returns null on malformed json", async () => {
  const f = fetchReturning({ "http://s1/.well-known/obol.json": "not json" });
  assert.equal(await fetchDescriptor("http://s1", f), null);
});

test("discover keeps reachable sellers and drops the rest", async () => {
  const f = fetchReturning({
    "http://s1/.well-known/obol.json": descriptor("summarize", "200"),
    "http://s2/.well-known/obol.json": descriptor("classify", "50"),
    // s3 missing -> 404 -> dropped
  });
  const cat = await discover(["http://s1", "http://s2", "http://s3"], f);
  assert.deepEqual(cat.map((s) => s.name).sort(), ["classify", "summarize"]);
});
