# Obol — Lepton Agents Hackathon submission

**Agent-to-agent service market settling nanopayments on Arc, via ArcPay.**
RFB #1 (Agent-to-Agent Marketplace) + #2 (metered payments).

## What it is
A buyer AI agent is given a goal and a USDC budget. It **discovers** seller agents'
paid micro-services, **decides** (via Claude) which to call within budget, **pays per
call in native USDC on Arc** through ArcPay's `PayPerCall`, and is served only after the
seller verifies the on-chain receipt. Value too small to move before — 50–200 wei per
call — clears in under half a second on Arc.

## Why
AI agents are becoming economic actors that buy services from each other. Those services
are small and constant; most chains can't price a sub-cent call (gas eats it, volatile
fees make budgets impossible). Arc's native-USDC gas + sub-second finality make a real
machine economy of nanopayments viable. Obol is that economy, in miniature.

## How (architecture)
- **Sellers** (`src/services.ts`, `src/seller.ts`): three micro-services — `summarize`,
  `classify`, `price-lookup` — each registered as a `PayPerCall` endpoint and served over
  HTTP gated by the on-chain receipt (with an off-chain replay guard, since `CallReceipt`
  has no consumed flag).
- **Discovery** (`src/discovery.ts`): reads each seller's `/.well-known/obol.json` into a catalog.
- **Buyer brain** (`src/decide.ts`, `src/llm.ts`, `src/agent.ts`): a DI loop where Claude
  decomposes the goal, ranks services by capability/price within budget, produces the
  service input, pays, evaluates the result, and stops when the goal is met. Falls back to
  a deterministic policy if the LLM is unavailable, so it never stalls.
- **Settlement**: ArcPay `PayPerCall.pay{value: pricePerCall}` on Arc testnet; the `callId`
  is read from the emitted `Paid` event.

## Live evidence (Arc testnet, in-window)
Buyer `0x63A1E17d8f4B48a54B0200dEa96019618F179D07` (account1001), goal:
*"look up the price of ETH, then classify the sentiment of this tweet: Arc nanopayments are absolutely amazing"*

Claude's autonomous run (real on-chain settlement):
1. **price-lookup** — *"First part of the goal is to look up the price of ETH. This service
   costs 80 wei which is within budget."* → paid 80 wei → `{symbol: ETH, priceUsd: 3200}`
   tx `https://testnet.arcscan.app/tx/0xf505e277de307b348e687dacec932f6d0f7dc89b86c0b3468826bbe6c0aa55a3` (callId 22880)
2. **classify** — *"Need to classify the sentiment of the tweet... within remaining budget of
   920 wei."* → paid 50 wei → `{label: positive}`
   tx `https://testnet.arcscan.app/tx/0xdf1a4ae611d4b1cb114a66492d058f996963d4c436694345442a9ab82c5be210` (callId 22887)
3. **stop** — *"The goal is fully met: ETH price was looked up ($3200) and the tweet sentiment
   was classified as positive. No further actions are needed, and the only remaining service
   (summarize) does not contribute to the completed goal."*

Total: 130 wei across 2 on-chain calls.
Buyer activity: `https://testnet.arcscan.app/address/0x63A1E17d8f4B48a54B0200dEa96019618F179D07`

## Run it
```bash
cd obol && npm install
npm test                       # 35 unit tests (offline)
npx tsx src/run-market.ts      # offline dry-run of the agent loop
npx tsx scripts/live.ts        # real settlement on Arc testnet (needs funded accounts)
```

## Judging fit
- **Agentic sophistication:** Claude genuinely decides — decomposes the goal, reasons about
  budget, produces correct inputs, stops when done.
- **Traction:** every call is a real on-chain USDC payment (arcscan above).
- **Circle tools:** native USDC, `PayPerCall` (x402-style), Arc sub-second settlement.
- **Innovation:** a working agent-to-agent market with LLM-driven autonomy.

Built on ArcPay (this repo); the `obol/` layer is new in-window work — see git history on the
`lepton-hackathon` branch and `docs/superpowers/specs/2026-06-22-obol-agent-market-design.md`.
