# {{projectName}}

A "Buy me a coffee" style tip page on Arc Network, built with [ArcPay](https://arcpay.io).

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local, set NEXT_PUBLIC_CREATOR_USERNAME
npm run dev
```

Visit http://localhost:3000 and watch your tip page come alive.

## Configure

Edit `.env.local`:
- `NEXT_PUBLIC_CREATOR_USERNAME` — your ArcPay registered username
- `NEXT_PUBLIC_NETWORK` — `local` or `testnet`

Don't have a username yet? Register:
```bash
npx arcpay register myname
```

## Deploy

```bash
npx vercel
```

Share your link: `https://{{projectName}}.vercel.app` or `https://arcpay.io/tip/yourname`.

## Fee

ArcPay takes 2% of each tip as protocol fee. 98% goes directly to your wallet on Arc.

## Network: {{network}}

See [docs.arcpay.io/templates/creator-tip](https://docs.arcpay.io/templates/creator-tip) for customization.
