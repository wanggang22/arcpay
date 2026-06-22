# Obol — Agent-to-Agent Service Market on Arc (Design)

**Date:** 2026-06-22
**Hackathon:** Lepton Agents Hackathon (Canteen × Circle), Jun 15–29 2026
**Builds on:** ArcPay (this repo) — reuses the deployed `PayPerCall` nanopayment rail on Arc testnet.
**Submission repo:** github.com/wanggang22/arcpay, branch `lepton-hackathon` (in-window work, commits intact per host rule).

---

## 1. The idea

**Obol** is an agent-to-agent service market. A **buyer agent** is given a high-level goal and a budget; it autonomously **discovers** seller agents' paid micro-services, **decides** which to call (price vs. fit), **pays per call in USDC on Arc** through ArcPay's `PayPerCall`, uses the results, and **iterates** until the goal is met or the budget is spent.

The lepton/obol framing: value too small to have been worth moving before (a fraction of a cent per call) now clears in <0.5s on Arc, so software can run a real economy of tiny payments.

## 2. Why this wins (alignment with judging)

| Criterion | Weight | How Obol scores |
|---|---|---|
| Agentic Sophistication | 30% | Buyer agent genuinely **decides** — decomposes the goal, ranks services, makes price/fit tradeoffs, decides when to stop. Targets "full autonomy", not AI-flavored automation. |
| Traction (in-window) | 30% | Every service call is a real on-chain USDC payment (`Paid` event). Running the market repeatedly accumulates real test-USDC volume during Jun 15–29. |
| Circle tool usage | 20% | Native USDC, `PayPerCall` (x402 / ERC-8183 style), `batchPay`, Arc sub-second settlement. |
| Innovation | 20% | A working A2A economy with emergent buy/sell behavior — flagship RFB #1 ("Agent-to-Agent Marketplace") + #2 (metered payments). "New territory", not a polished re-run. |

## 3. Architecture

Four components, each independently runnable and testable:

```
                 ┌──────────────────────────────────────────┐
   goal+budget → │            BUYER AGENT (core)            │
                 │  LLM decision loop:                       │
                 │  decompose → discover → choose → pay →    │
                 │  use result → reassess → stop?            │
                 └───────┬───────────────────────┬──────────┘
                         │ reads catalog          │ pay() / batchPay()
                         ▼                         ▼
                 ┌───────────────┐        ┌──────────────────┐
                 │  DISCOVERY    │        │  ArcPay PayPerCall │  ← already deployed
                 │  (catalog of  │        │  on Arc testnet    │     (Arc testnet)
                 │  endpoints +  │        │  Paid event        │
                 │  descriptors) │        └─────────┬──────────┘
                 └───────┬───────┘                  │ settlement
                         │ describes                ▼
                 ┌───────┴───────────────┐   ┌──────────────┐
                 │  3 SELLER AGENTS      │   │ TRACTION FEED │
                 │  each = a paid micro- │   │ (live Paid    │
                 │  service + endpoint   │   │  events +     │
                 │  registered on-chain  │   │  arcscan)     │
                 └───────────────────────┘   └──────────────┘
```

### 3.1 Seller agents (3)
Each seller is a small HTTP service that:
- Offers one **real** micro-service. MVP set:
  1. **`fetch-summarize`** — fetch a URL and return a short summary.
  2. **`classify`** — sentiment / category of a text snippet.
  3. **`price-lookup`** — current price/quote for a token or asset.
- On startup, registers a `PayPerCall` endpoint via `registerEndpoint(username, name, pricePerCall)` with a per-call USDC price (sub-cent).
- Exposes a **service descriptor** (`GET /.well-known/obol.json`): name, capability text, input schema, `endpointId`, price.
- **Verifies payment before serving**: the buyer pays on-chain → gets a `callId` → seller checks `getReceipt(callId)` (payer + endpoint + not-yet-consumed) before returning the result. x402-style: pay first, then call.

### 3.2 Discovery
A lightweight catalog the buyer reads:
- Reads each seller's `/.well-known/obol.json` (a small registry file lists the seller URLs for the MVP).
- Optionally cross-checks the on-chain endpoint (`getEndpointByName`) so price/active status is trust-minimized.
- Returns a normalized list `{name, capability, inputSchema, endpointId, priceWei, sellerUrl}` to the buyer.

### 3.3 Buyer agent (the core — this is the "agentic" 30%)
A loop driven by the LLM (Claude via `ANTHROPIC_API_KEY`):
1. **Decompose** — turn the goal into concrete sub-tasks.
2. **Discover** — get the catalog.
3. **Choose** — for the next sub-task, the LLM picks a service by capability match and price, *within remaining budget*. It may decide a sub-task isn't worth paying for, or that two services are needed.
4. **Pay** — `pay(endpointId)` (or `batchPay` when it foresees N calls) → real USDC settlement on Arc → `callId`.
5. **Call** — hit the seller with the `callId`; seller verifies receipt; returns result.
6. **Reassess** — LLM evaluates the result, updates the plan, decides continue/stop. Stops on goal-complete or budget-exhausted.
Every decision + payment is logged with reasoning (for the demo + traction evidence).

### 3.4 Traction feed
- Indexes `Paid` events from `PayPerCall` and renders a live feed: timestamp, buyer, seller, amount, `callId`, arcscan tx link.
- Reuses ArcPay's existing activity/dashboard surfaces where possible; a thin standalone page is acceptable for the MVP.
- This is the evidence of "genuine usage during the event window."

## 4. Data flow (one sub-task)
```
buyer.decide(service) → PayPerCall.pay(endpointId){value: price} → callId, Paid event
   → GET seller/serve?callId=… → seller: getReceipt(callId) ok? → result
   → buyer.use(result) → reassess
```

## 5. Reuse vs. new (eligibility)
- **Reused (April baseline, not judged):** `PayPerCall.sol` + deployment on Arc testnet, ArcPay SDK primitives, dashboard/activity UI, arcscan links.
- **New (in-window, judged — all committed Jun 22–29 on `lepton-hackathon`):** the entire `obol/` layer — seller agents, service descriptors + on-chain-verified serving, discovery/catalog, the buyer agent LLM decision loop, the traction feed wiring, tests, and the demo.

## 6. Scope / YAGNI (7-day MVP)
**In:** 3 seller services, 1 buyer agent with real LLM decisions, on-chain pay-then-serve with receipt verification, a live traction feed, a scripted end-to-end run, a HyperFrames demo video.
**Out (explicitly deferred):** reputation/identity (ERC-8004), disputes/refunds, multi-buyer competition, mainnet, a polished marketplace UI, agent-discovers-agent over a public network (MVP uses a known seller list).

## 7. Testing
- **Unit:** discovery parsing, receipt-verification gate, budget accounting, choose() given a catalog + budget.
- **Integration (local Arc / forked):** full pay → receipt → serve loop against a local `PayPerCall` (repo already supports chainId 1337 local).
- **Live (Arc testnet):** the real run that produces the traction; needs funded agent wallets (see §8).
- Per repo norms: Foundry for contracts (no contract changes expected), TS/Python tests for the agent layer.

## 8. What the on-chain run needs from the user (later, not now)
- Arc testnet RPC (already in repo config).
- 1 buyer wallet + 3 seller wallets on Arc testnet, buyer funded with test USDC from the faucet (sub-cent prices → tiny amounts).
- Testnet private keys in a local `.env` (testnet only, negligible value). Never committed.
- `ANTHROPIC_API_KEY` (already in `~/.claude-apis.env`).
I will build everything to run against local/mock first, so plugging in testnet keys is the only manual step.

## 9. Demo (HyperFrames)
A 2–3 min video: state a goal + budget → watch the buyer agent reason and choose → real USDC settling on arcscan → final assembled result → the traction feed of payments. Script + render via HyperFrames.

## 10. Risks
- **LLM nondeterminism** in choose/reassess → constrain with a strict tool/schema interface and a deterministic fallback ranker; log every decision.
- **Testnet flakiness / faucet limits** → keep prices sub-cent, batch where possible, retry with backoff.
- **Scope creep** → the §6 "Out" list is firm; reputation/disputes are post-hackathon.
- **Time** → 7 days; build order front-loads the on-chain pay→serve loop (the riskiest integration) before polish.
