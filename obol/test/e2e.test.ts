// End-to-end receipt-gated paid call against ArcPay's PayPerCall.
//
// Gated behind E2E=1 so unit runs stay fast/offline. The live run targets ARC TESTNET
// (the deployed PayPerCall is the rail; no local anvil in this environment) — which is
// also how Obol produces real in-window test-USDC traction for judging.
//
// Preconditions (set up once, see obol/README.md):
//   - A seller username is registered in ArcPay's UsernameRegistry, and an endpoint is
//     registered via PayPerCall.registerEndpoint(username, "echo", priceWei).
//   - Env:
//       NETWORK=testnet
//       BUYER_PK=0x...            (funded with a little test USDC from the Arc faucet)
//       BUYER_ADDR=0x...          (the buyer's address)
//       SELLER_ENDPOINT_ID=0x...  (the registered echo endpoint id)
//
// Run: cd obol && E2E=1 NETWORK=testnet BUYER_PK=... BUYER_ADDR=... SELLER_ENDPOINT_ID=... npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createSellerService } from "../src/seller.ts";
import { payAndCall } from "../src/buyer.ts";
import type { NetworkName } from "../src/chain.ts";

const E2E = process.env.E2E === "1";
const PORT = 7801;

test("e2e: unpaid call is rejected (402); paid call is served once (then 409 on replay)", { skip: !E2E }, async () => {
  const network = (process.env.NETWORK as NetworkName) ?? "testnet";
  const endpointId = process.env.SELLER_ENDPOINT_ID as `0x${string}`;
  const buyerPk = process.env.BUYER_PK as `0x${string}`;
  const buyerAddress = process.env.BUYER_ADDR as `0x${string}`;
  assert.ok(endpointId && buyerPk && buyerAddress, "missing E2E env (SELLER_ENDPOINT_ID/BUYER_PK/BUYER_ADDR)");

  const seller = createSellerService({
    name: "echo",
    capability: "echoes the input back",
    endpointId,
    priceWei: "0",
    network,
    handle: async (i) => i,
  });
  await new Promise<void>((r) => seller.listen(PORT, r));
  const sellerUrl = `http://127.0.0.1:${PORT}`;

  try {
    // Unpaid: a bogus callId must be refused with 402.
    const bad = await fetch(`${sellerUrl}/serve?callId=999999999&payer=${buyerAddress}`, {
      method: "POST",
      body: "{}",
    });
    assert.equal(bad.status, 402, "unpaid call should be 402");

    // Paid: real on-chain pay → callId from Paid event → served.
    const out = await payAndCall({
      buyerPk,
      buyerAddress,
      endpointId,
      sellerUrl,
      input: { hello: "obol" },
      network,
    });
    assert.deepEqual(out.result, { hello: "obol" }, "paid call should echo input");
    assert.ok(out.callId >= 0n, "callId should be present (>= 0)");

    // Replay: the same callId must be refused with 409 (off-chain consumed guard).
    const replay = await fetch(`${sellerUrl}/serve?callId=${out.callId}&payer=${buyerAddress}`, {
      method: "POST",
      body: JSON.stringify({ hello: "obol" }),
    });
    assert.equal(replay.status, 409, "replayed callId should be 409");
  } finally {
    await new Promise<void>((r) => seller.close(() => r()));
  }
});
