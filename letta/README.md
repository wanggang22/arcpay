# Letta — autonomous invoice-factoring agent on Arc

Ignyte *Stablecoins Commerce Stack Challenge* · **Track 2 — SME Trade Finance**.

An AI agent that is a **credit committee with money at stake**. An SME has an unpaid
invoice and needs cash now. The agent reads the buyer's **real on-chain payment history
on Arc**, prices an advance (advance % + discount rate) with a written reasoning memo,
disburses USDC to the supplier, and runs a **3-way repayment waterfall** as the buyer
pays — recovering the factor's advance + fee first, then routing surplus to the supplier.
Partial and late payments are first-class: the agent **re-assesses exposure live** on
every repayment.

Why factoring (not escrow): the agent's decision is a *judgment with money at risk*
(price the advance, set the haircut), not "approve a document the builder authored" —
so the autonomy is real, not theater.

## What's on-chain

- **`FactoringPool.sol`** (in `../contracts/src/`) — deployed on Arc testnet, settles in
  native USDC. Push-with-escrow-fallback payouts (a griefing recipient can never brick the
  waterfall or strand the factor's recovery), overpayment refunds, `withdraw()` recovery.
  18 forge tests (incl. an adversarial security pass). Pool:
  [`0xcE93…01F5`](https://testnet.arcscan.app/address/0xcE939A8048b8BF5bE9DfE639d4C65227A99901F5)
- The buyer's credit signal = ArcPay **PayPerCall `Paid` events** (real, unfakeable Arc
  payment history), reused as the underwriting data source.

## The brain (reuses Obol's loop)

- `src/history.ts` — distill credit features from the buyer's on-chain `Paid` events.
- `src/underwrite.ts` — **Claude** prices advance% + discount + reasoning memo; deterministic
  risk policy backs it up so the agent never stalls.
- `src/pool.ts` — viem client for FactoringPool (fund / repay / waterfall, event parsing).
- `src/orchestrator.ts` — underwrite → fund → re-assess exposure on each repayment.

## Run it

```bash
npm install
npm test                 # 14 unit tests (offline: features, underwriting, waterfall math)
npm run typecheck
npx tsx scripts/live.ts  # REAL end-to-end on Arc testnet (needs funded accounts)
```

## Verified live run (in-window, real USDC on Arc testnet)

Claude underwrote a thin-file buyer and the contract settled the full waterfall:

- **Underwrite [Claude]:** advance **70%** (700,000 wei), discount **4.5%** (fee 45,000 wei).
  Memo cited the thin file, 0.67 counterparty concentration, the 210-wei-history vs
  1,000,000-wei-invoice size mismatch, and recent activity.
- **Fund:** [tx 0xbbf2…](https://testnet.arcscan.app/tx/0xbbf25219d092b43dfa6223971e714eba31fc06d6fdc2dfe4df72d7c3727771c4) — supplier +700,000 wei.
- **Partial pay (40%):** [tx 0xebb8…](https://testnet.arcscan.app/tx/0xebb83f06084df34aed7e7a65bd7b6e92d3d64bbf3ca18a570e98798eb38aa6b1) — all 400,000 to the factor; agent re-rated exposure 745k → 345k.
- **Late remainder + settle:** [tx 0x7642…](https://testnet.arcscan.app/tx/0x764240eaf5aff49af0d5d525d19e7585e63029f7c7591f0bca8e77c98793c9d2) — factor recovers 345k (whole at 745k), supplier surplus 255k, **settled**.
- Result: collected 1,000,000 · factor recovered 745,000 (profit = fee 45,000) · supplier
  955,000 (= face − fee). Full evidence in `evidence/run.json`.

On-chain amounts are tiny test-USDC wei; the narrative is a $100k invoice. MIT licensed.
