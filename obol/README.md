# Obol — agent-to-agent service market on Arc

Obol lets AI agents **buy and sell services from each other in fractions of a cent**,
settled on Arc in USDC via ArcPay's `PayPerCall`. A buyer agent gets a goal + budget,
discovers seller agents' paid micro-services, decides what to call, **pays per call
on-chain**, and only then is served.

Built for the **Lepton Agents Hackathon** (Canteen × Circle). New in-window work on top
of the ArcPay baseline — see `docs/superpowers/specs/2026-06-22-obol-agent-market-design.md`.

## Phase 1 (this slice): the receipt-gated paid call

The core primitive, end-to-end:

```
buyer.payAndCall → PayPerCall.pay(endpointId){value: pricePerCall}   // native USDC on Arc
   → callId (read from the Paid event)
   → POST seller /serve?callId&payer
   → seller: getReceipt(callId) matches (endpoint, payer)? not already served?
   → result
```

- `src/payments.ts` — `payEndpoint` (pays exactly `pricePerCall`, returns the `callId` from
  the `Paid` event), `verifyReceipt`, `getReceipt`.
- `src/seller.ts` — HTTP service: `/.well-known/obol.json` descriptor + `POST /serve` that
  verifies the on-chain receipt and honors each `callId` exactly once (replay guard, since
  `CallReceipt` has no on-chain consumed flag).
- `src/buyer.ts` — `payAndCall`: pay, then call the seller with the `callId`.
- `src/chain.ts` / `src/abi.ts` — viem clients + the `PayPerCall` ABI fragment, reading
  ArcPay's `contracts/deployments/current.json` (defaults to **Arc testnet**).

## Run

```bash
cd obol
npm install
npm test          # unit tests (offline); the e2e is skipped unless E2E=1
npm run typecheck
```

### Live e2e (real settlement on Arc testnet)

This is also how Obol earns real in-window traction. One-time setup:

1. A seller username registered in ArcPay's `UsernameRegistry`, with an endpoint:
   `PayPerCall.registerEndpoint(username, "echo", priceWei)` → note the returned `endpointId`.
2. A buyer wallet funded with a little test USDC (Arc faucet).

Then:

```bash
E2E=1 NETWORK=testnet \
  BUYER_PK=0x... BUYER_ADDR=0x... SELLER_ENDPOINT_ID=0x... \
  npm test
```

Asserts: unpaid call → `402`, paid call → served, replayed `callId` → `409`.

## Roadmap
- **Phase 2** — buyer brain: LLM decision loop (decompose → choose by capability/price/budget → reassess → stop).
- **Phase 3** — discovery + 3 real sellers (`fetch-summarize`, `classify`, `price-lookup`).
- **Phase 4** — traction feed: index `Paid` events → live payments view + arcscan links.
- **Phase 5** — live testnet run (real sub-cent USDC volume) + HyperFrames demo video.
