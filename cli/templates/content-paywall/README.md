# {{projectName}}

Gated content paywall on Arc Network, built with [ArcPay](https://arcpay.finance). Sell access to articles, videos, or courses in USDC. Pay-once, on-chain receipt, works forever.

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local (title, slug, price, creator handle)
npm run dev
```

Visit http://localhost:3000 to preview. Connect wallet → click Unlock → the gated content appears.

## Configure

Edit `.env.local`:
- `NEXT_PUBLIC_CREATOR_USERNAME` — your ArcPay handle (registered on-chain)
- `NEXT_PUBLIC_CONTENT_SLUG` — hashed into a unique `contentId` (e.g., `my-article-42`)
- `NEXT_PUBLIC_CONTENT_TITLE` — title shown to the reader
- `NEXT_PUBLIC_PRICE_USDC` — price in USDC (e.g., `0.05`)
- `NEXT_PUBLIC_NETWORK` — `local` or `testnet`

## Deploy

```bash
npx vercel
```

## Fee

ArcPay takes 2% per purchase. 98% lands directly in your wallet on Arc.

## Network: {{network}}

See [arcpay.finance/build](https://arcpay.finance/build) for customization docs.
