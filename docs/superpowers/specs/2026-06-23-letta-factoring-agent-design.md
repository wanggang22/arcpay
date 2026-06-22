# Letta — Autonomous Invoice-Factoring Agent (design spec)

> Ignyte "Stablecoins Commerce Stack Challenge" · Track 2 (SME Trade Finance & Working Capital, 8000 USDC pool) · deadline 2026-07-13.
> Decided 2026-06-23 after a 19-concept, adversarially-scored ideation workflow. Letta is the chosen Ignyte entry; Obol stays the Lepton entry.

## Goal

An autonomous **credit committee** agent. An SME with an unpaid invoice gets cash now: the agent ingests the buyer's **real on-chain payment history on Arc**, prices an advance (advance % + discount rate) with a written reasoning memo, disburses test-USDC to the supplier, and later collects from the buyer — running a 3-way repayment waterfall. When the buyer pays **late or partially**, the agent detects it on-chain and **re-prices / escalates live**.

## Why this wins Track 2

- Hits the literal headline example: *"invoice factoring with repayment waterfalls."*
- The agent's decision is a **judgment with money at stake** (price risk, set the haircut), which reads as genuine reasoning even to a hostile judge — unlike escrow/proof-of-delivery agents that "judge a document the builder authored" (fancy oracle).
- Reasons over events it provably did not author (real Arc `Paid` settlement history).
- 8000 prize, thin agentic field, UAE/SME-relevant.

## Architecture

```
 invoice (JSON) + buyer address
            │
   ┌────────▼─────────────────────────────┐
   │   UNDERWRITING AGENT (Claude)         │  ← reuses Obol's decide/agent/llm loop
   │   read on-chain buyer history →        │
   │   score risk → quote advance% +        │
   │   discount → reasoning memo →          │
   │   on late/partial pay: re-underwrite   │
   └───┬───────────────────────────┬───────┘
 reads │ Arc Paid-event history    │ disburse / collect / waterfall
       ▼                           ▼
 ┌──────────────┐         ┌──────────────────────┐
 │ Arc on-chain │         │  FactoringPool.sol    │  ← the ONE net-new contract
 │ Paid history │         │  (Arc testnet)        │
 │ (PayPerCall) │         │  disburse→collect→     │
 └──────────────┘         │  3-way waterfall +     │
                          │  late/partial branch   │
                          └──────────────────────┘
```

### FactoringPool.sol (net-new — the load-bearing build)
- `fundInvoice(invoiceId, supplier, buyer, faceValue, advanceWei, feeWei)` — factor disburses `advanceWei` USDC to `supplier` now.
- `repay(invoiceId)` payable — buyer (or anyone) pays toward the invoice; partial allowed.
- Waterfall on repayment: factor recovers `advance + fee` first → surplus to supplier. Tracks `collected` vs `owed`; emits `Funded`, `Repaid(partial?)`, `WaterfallSettled`.
- Native-USDC `pay{value}` pattern + `Paid`-style receipt events, mirroring `PayPerCall.sol`.
- Access control: only the registered factor funds; reentrancy-safe; no self-dealing shortcuts.

### Underwriting agent (reuse Obol)
- `decide.ts` / `llm.ts` repointed: input = structured invoice + on-chain buyer features (count of paid calls, punctuality, avg latency, concentration). Output = `{ advancePct, discountRate, reasoningMemo, decision }`.
- `payments.ts` / `chain.ts` reused for reading `Paid` events and writing settlement txs.
- Deterministic fallback policy if the LLM is unavailable (never stalls), same pattern as Obol.

## The demo (90s, the differentiator)
SME cash-starved on a 60-day invoice → agent reads buyer's *real* Arc history → prices 88% advance at 2.1% in ~4s with a visible memo → wires USDC now → buyer pays **late** → agent catches it on-chain, **re-prices live**, settles the waterfall sub-second. One screen, one contestable judgment, real USDC moving twice (verifiable callIds on testnet.arcscan.app).

## Circle / Arc tools
USDC (native gas, `pay{value}`), Circle Wallets, on-chain `Paid` receipts as the credit signal, Arc sub-second finality. USYC (idle-float yield as advance capital) = **narrative slide only**, stubbed (enterprise-gated) — never load-bearing.

## Reused assets (~50-60% head start)
- `arcpay/obol/src/{decide,agent,llm,payments,chain}.ts` — the underwriting brain.
- `arcpay/contracts/src/PayPerCall.sol` — native-USDC pay/receipt pattern + the credit-signal data source.
- `arcpay/autonomous-products/product5-escrow/` — state-machine / access-control reference (NOT a drop-in).
- ArcPay `DESIGN.md` (ivory + forest green + Fraunces), viem, Anthropic SDK, HyperFrames, make-pdf (signable credit memo).
- Foundry at `~/.foundry/bin/forge.exe`.

## 3-week plan (with day-5 hard gate)
- **Week 1 — FactoringPool.sol (the honest hard part).** TDD with forge: fund→repay→waterfall + late/partial branch. Deploy to Arc testnet, capture callIds. Seed 2-3 buyer wallets with *varied* on-chain punctuality (labeled honestly) so the agent has real signal.
  - **Day-5 GATE:** if FactoringPool isn't deploying clean on Arc testnet → fall back to the payroll agent (Track 1), `arcane-payroll-demo` is shovel-ready.
- **Week 2 — the agent + re-underwriting loop.** Repoint Obol's decide/llm to invoice + on-chain features → advance%, discount, reasoning memo. Wire disburse + the live re-underwrite-on-partial-payment branch (the demo's whole differentiator).
- **Week 3 — UI, traction, video.** Ivory/forest dashboard (taste-skill + DESIGN.md): invoice in → reasoning memo → waterfall viz → live receipts wall. Bank a dozen real on-chain settlements as in-window traction. HyperFrames demo. make-pdf signable credit memo.
- **Verify before submit:** fresh run, read receipts on arcscan, confirm callIds, confirm late-payment branch fires deterministically on camera.

## Cold-start risk + mitigation
Fresh testnet = thin history. Mitigation: during the demo a buyer wallet makes a *real* partial USDC payment on Arc and the agent **re-underwrites live in front of judges** (verifiable callId before/after) — converts "synthetic fixture" into "grounded in an in-window settlement."

## Out of scope (YAGNI for the hackathon)
PDF/OCR invoice ingestion (use structured JSON), multi-currency, real KYC, production custody, USYC live integration.
