# @wanggang22/arcpay-sdk

> 📦 Published under `@wanggang22` scope for now. An `@arcpay` npm org is planned post-hackathon; package will be mirror-published there with version parity.

**USDC payment primitive for creators, apps, and AI agents on [Arc Network](https://arc.network).**

Tips · Subscriptions · Content paywalls · Pay-per-call API billing — one SDK, four payment modes, 2% fee, no Stripe, no KYC, works with email or wallet. Pay humans *and* AI agents.

Live at [arcpay.finance](https://arcpay.finance) · Full docs at [arcpay.finance/build](https://arcpay.finance/build) · Source on [GitHub](https://github.com/wanggang22/arcpay).

---

## Install

```bash
npm install @wanggang22/arcpay-sdk viem
```

## Quickstart

```ts
import { ArcPayClient } from '@wanggang22/arcpay-sdk';

const client = new ArcPayClient({
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

// 💸 Send a tip
await client.tips.send({
  username: 'gavin',
  amount: '0.005',
  message: 'Loved your post!',
});

// 📅 Subscribe for N months
await client.subs.subscribe({ planId: 0n, months: 3 });

// 🔒 Buy paywalled content
await client.paywall.purchase(contentId, priceWei);

// ⚡ Prepay 100 API credits in one tx (x402 / ERC-8183)
await client.api.batchPay('gavin', 'summarize-paper', 100);
```

Get free testnet USDC at [arcpay.finance/faucet](https://arcpay.finance/faucet).

## Four payment modes

| Mode | Typical use | Contract |
|---|---|---|
| 💸 Tip | One-time support, BuyMeACoffee-style | `TipJar` |
| 📅 Subscribe | Monthly/yearly, Patreon-style | `Subscriptions` |
| 🔒 Content Paywall | Single-item purchase, Gumroad-style | `ContentPaywall` |
| ⚡ Pay-per-call API | Prepaid API credits, agent-friendly | `PayPerCall` |

## Read-only gating (no database)

The chain *is* your subscriber list. Check active subscription on any wallet with two RPC calls:

```ts
const isActive = await client.subs.isActive(wallet, planId);
if (isActive) renderPremiumContent();
```

Same pattern works for Content and PayPerCall.

## x402-compatible agent payments

```ts
// Agent prepays 1000 calls; SDK auto-signs each HTTP request
await client.api.batchPay('creator', 'endpoint-name', 1000);
const result = await client.api.call('creator', 'endpoint-name', { input });
```

Server verifies `receipts[callId].payer` equals signature recovery address. No API key, no OAuth.

## Network support

| Network | chainId | RPC |
|---|---|---|
| Arc Testnet | `5042002` | `https://rpc.testnet.arc.network` |
| Arc Local | `1337` | `http://localhost:8545` |

USDC is the native gas token on Arc — one currency for fees and payments.

## Contract addresses (Arc Testnet)

Canonical source: [`contracts/deployments/current.json`](https://github.com/wanggang22/arcpay/blob/master/contracts/deployments/current.json)

- UsernameRegistry: `0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb`
- TipJar: `0x45daE58fB5b89C4E994216D2af0B73232641DF3B`
- TipJarByHandle: `0x291b86d46027f734cF43Eca9BA2394F46dcd529C`
- Subscriptions: `0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380`
- ContentPaywall: `0x680884124F21939548Ba7f982B4F275A55783484`
- PayPerCall: `0x3a399A310965A5cbD5a2B9F21a3B9885B6372def`

## Developer docs

Full API reference + integration recipes (Next.js blog, Discord bot, Express middleware, AI agent):

👉 **[arcpay.finance/build](https://arcpay.finance/build)**

## License

MIT · © 2026 ArcPay contributors
