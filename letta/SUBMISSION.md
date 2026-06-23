# Letta — Ignyte Stablecoins Commerce Stack · Track 2 (SME Trade Finance)

**Project:** Letta — an autonomous invoice-factoring agent on Arc, settled in USDC.
**Circle account email:** wangligang16161616@gmail.com
**Repo:** https://github.com/wanggang22/arcpay/tree/letta
**Track:** Best SME Trade Finance & Working Capital Workflow (invoice factoring with repayment waterfalls).

## Problem
SMEs die on cash flow: they ship goods, issue an invoice with 30-90 day terms, then wait
months for money they need now to make payroll and buy materials. Factoring fixes this —
a financier advances cash against the invoice and collects from the buyer later — but
underwriting (should we advance? how much? at what discount?) is slow, manual, and closed
to small suppliers. There's no rail to do it programmatically in stablecoins.

## What we built
An AI agent that is a **credit committee with money at stake**. It reads the buyer's **real
on-chain payment history on Arc**, prices an advance (advance % + discount rate) with a
written reasoning memo, disburses USDC to the supplier now, and runs a **3-way repayment
waterfall** as the buyer pays — recovering the factor's advance + fee first, surplus to the
supplier. Partial and late payments are first-class: the agent **re-assesses exposure live**
on every repayment. The autonomy is genuine because the decision is a judgment with real
money at risk, not "approve a document I wrote."

Built on Arc: native-USDC settlement, sub-second finality. Reuses ArcPay's PayPerCall `Paid`
events as the buyer's unfakeable credit signal, and Obol's decide→pay→verify agent loop,
repointed from "which service to buy" to "should I advance against this invoice."

## How it works
- `FactoringPool.sol` — deployed on Arc testnet; native-USDC fund/repay/waterfall with
  push-with-escrow-fallback (a griefing recipient can't brick the waterfall or strand the
  factor), overpayment refunds, and `withdraw()` recovery. 18 forge tests incl. an
  adversarial security pass (5-lens review found + fixed a real push-payment DoS).
- `history.ts` → credit features from on-chain `Paid` events. `underwrite.ts` → Claude prices
  the advance + memo (deterministic fallback). `pool.ts` / `orchestrator.ts` → fund + live
  re-assessment. 14 unit tests + typecheck clean.
- **Working frontend + backend:** `npm run app` serves an interactive factoring console
  (`app/index.html`) backed by a thin HTTP API (`server.ts`). Submit an invoice and click
  through underwrite → fund → partial → late settle — each a real Arc tx. Verified end-to-end
  through the UI (fund `0xbcdff6e3…`, partial `0x418e4534…`, settle `0x812015c7…`).

## Traction — verified live on Arc testnet, in-window
Claude underwrote a thin-file buyer and the contract settled the full waterfall with real
test-USDC:
- **Underwrite [Claude]:** advance 70% (700,000 wei), discount 4.5%. Memo cited the thin file,
  0.67 counterparty concentration, the 210-wei-history vs 1,000,000-wei-invoice size
  mismatch, and recent activity.
- **Fund:** tx 0xbbf25219d092b43dfa6223971e714eba31fc06d6fdc2dfe4df72d7c3727771c4
- **Partial (40%):** tx 0xebb83f06084df34aed7e7a65bd7b6e92d3d64bbf3ca18a570e98798eb38aa6b1 — all to factor; agent re-rated exposure 745k → 345k.
- **Late remainder + settle:** tx 0x764240eaf5aff49af0d5d525d19e7585e63029f7c7591f0bca8e77c98793c9d2 — factor whole at 745k, supplier surplus 255k, settled.
- Pool: https://testnet.arcscan.app/address/0xcE939A8048b8BF5bE9DfE639d4C65227A99901F5

## Products used (Circle / Arc)
USDC (native gas, `pay{value}`), Arc smart contracts + sub-second finality, on-chain `Paid`
receipts as the credit signal, Anthropic Claude as the underwriter. Roadmap: Circle Wallets
(agent custody), Circle Gateway + CCTP (cross-chain advance capital), USYC (idle-float yield
as the factor's funding source).
