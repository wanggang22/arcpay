# {{projectName}}

Subscription platform on Arc Network (Substack / Patreon alternative), built with [ArcPay](https://arcpay.finance).

## Features

- Monthly USDC subscriptions with per-second accrual
- Auto-prorated refund on cancel
- 2% protocol fee (vs Patreon's 10%, Substack's 10%)
- Global — works for creators Stripe doesn't support
- On-chain — subscription is a receipt, not a database row

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local (plan id, price, creator handle)
npm run dev
```

Visit http://localhost:3000 to preview. Connect wallet → pick duration → see `Subscribe Nmo` → on-chain.

## Configure

Edit `.env.local`:
- `NEXT_PUBLIC_CREATOR_USERNAME` — your ArcPay handle (registered on-chain)
- `NEXT_PUBLIC_CREATOR_DISPLAY_NAME` — public display name
- `NEXT_PUBLIC_CREATOR_BIO` — one-line about you
- `NEXT_PUBLIC_PLAN_ID` — the on-chain plan id (from `createPlan()`)
- `NEXT_PUBLIC_PRICE_PER_MONTH` — monthly price in USDC (e.g., `0.01`)
- `NEXT_PUBLIC_NETWORK` — `local` or `testnet`

## Create a plan first

Your plan must exist on-chain before subscribers can pay. Using the SDK:

```ts
import { ArcPayClient } from '@wanggang22/arcpay-sdk';
const client = new ArcPayClient({ network: 'testnet', privateKey: '0x...' });
await client.subs.createPlan('your-handle', 'Premium', '0.01');
```

The returned `planId` goes into `NEXT_PUBLIC_PLAN_ID`.

## Deploy

```bash
npx vercel
```

## Fee

ArcPay takes 2% per subscription payment. 98% lands directly in your wallet on Arc.

## Network: {{network}}

See [arcpay.finance/build](https://arcpay.finance/build) for customization docs.
