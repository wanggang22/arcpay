# ArcPay

**USDC payments, programmable like the internet.**

Tips, subscriptions, paywalls, and pay-per-call billing on Arc Network. 2% fee. No Stripe account required. Native USDC gas — no separate gas token to manage.

---

## What it is

ArcPay is a **payments primitive** for Arc Network that serves:

- **Developers** — SDK, CLI, templates to build payment features in 5 minutes
- **Creators** — hosted service to accept USDC tips, subscriptions, paywalls
- **Anyone with a payment link** — `arcpay.io/yourname` works globally

Think of it as **the Stripe of USDC on Arc**.

## Why Arc

| | Stripe | Patreon | **ArcPay** |
|-|--------|---------|-----------|
| Fee | 2.9% + $0.30 | 8-12% | **2%** |
| Settlement | 2-7 days | Monthly | **0.5 seconds** |
| Countries | 50 | 60 | **Global** |
| Setup | KYC + biz docs | Stripe required | **Email only** |
| AI-agent friendly | ✗ | ✗ | **✓** |

## Four payment modes

1. **💸 Tips** — One-time USDC with a message. BuyMeACoffee replacement.
2. **📅 Subscriptions** — Monthly/yearly with auto-prorated refund on cancel.
3. **🔒 Content Paywall** — Gate articles, videos, courses with USDC.
4. **⚡ Pay-per-call** — x402-compatible API billing. Perfect for AI agents.

## Quick start

### As a developer (SDK)

```bash
npm install @arcpay/sdk
```

```typescript
import { ArcPayClient } from '@arcpay/sdk';

const client = new ArcPayClient({
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY,
});

// Register a username (one-time)
await client.registry.register('alice', 'Alice Chen', '');

// Send a tip
await client.tips.send({
  username: 'alice',
  amount: '0.005',
  message: 'Great work!',
});

// Subscribe
await client.subs.subscribe(planId, 3); // 3 months

// Pay for API call
await client.api.pay('alice', 'my-api', priceWei);

// Purchase content
await client.paywall.purchase(contentId, price);
```

### As a creator (Dashboard)

1. Visit [arcpay.io/dashboard](https://arcpay.io/dashboard) (or run locally)
2. Connect wallet
3. Claim your username (e.g., `alice`)
4. Share your link: `arcpay.io/alice`
5. Receive USDC — tips, subs, paywall, API — all in one place

### Scaffold a project

```bash
npx create-arc-app my-app
```

Pick from 5 templates:
- Creator Tip Page
- Subscription Platform
- Content Paywall
- Paid API (x402)
- Agent Payment Gateway

## Live deployments

### Arc Testnet (public, chainId 5042002)
- ArcPayHub:       [`0x79ab5a4B2770BF087aF2fF4CEdb0E67A413bf293`](https://explorer.testnet.arc.network/address/0x79ab5a4B2770BF087aF2fF4CEdb0E67A413bf293)
- UsernameRegistry: `0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb`
- TipJar:          `0x45daE58fB5b89C4E994216D2af0B73232641DF3B`
- Subscriptions:   `0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380`
- ContentPaywall:  `0x680884124F21939548Ba7f982B4F275A55783484`
- PayPerCall:      `0xe407A796D81302987Ef950bdC01Ef4eA0b081b6C`

### Arc Local (chainId 1337)
- ArcPayHub: `0x1b38dE812703aaED3fE7B584e2a0E8D0b95F60Cb`
- UsernameRegistry: `0xD85677eBC8b242E5110C69f1d1f134389319632C`
- TipJar: `0xC627bf4D1f21dcc82Ef563191f63723CD290959f`
- Subscriptions: `0x0D4e458145A8eE377FD90295dd3332ee5BC90aE4`
- ContentPaywall: `0x352fc9770F1c72c0B91d7D62946EDa67A6288A95`
- PayPerCall: `0xc6f99Bdb0985aC8c5E7819f3e89dccA7C8A4C06a`

## Repository layout

```
arcpay/
├── contracts/        # Solidity (Foundry) — 6 modules + deployment script
├── sdk/
│   ├── js/          # @arcpay/sdk (TypeScript)
│   └── python/      # (planned)
├── cli/             # create-arc-app CLI + 5 templates
├── server/          # Hosted backend (planned v0.2)
├── dashboard/       # Next.js creator dashboard (:4001)
├── landing/         # arcpay.io marketing site (:4000)
└── docs/            # Nextra docs (planned)
```

## Local development

```bash
# 1. Compile + deploy contracts
cd contracts
forge build
RPC=http://localhost:8545 PK=0x... bash script/deploy.sh

# 2. Build SDK
cd ../sdk/js
npm install
npm run build
node --import tsx test/smoke.test.ts  # end-to-end test

# 3. Run dashboard
cd ../../dashboard
npm install
npm run dev  # :4001

# 4. Run landing
cd ../landing
npm install
npm run dev  # :4000
```

## Architecture

```
┌───────────────────────────────────────────────────┐
│                     ArcPay                         │
│  ┌─────────────────────────────────────────────┐  │
│  │           ArcPayHub (registry)               │  │
│  └─────────────────────────────────────────────┘  │
│                        │                           │
│   ┌────────┬──────────┼──────────┬──────────┐    │
│   ▼        ▼          ▼          ▼          ▼    │
│ TipJar  Subs    Paywall   PayPerCall  UsernameReg  │
└───────────────────────────────────────────────────┘
         │          │          │           │
         ▼          ▼          ▼           ▼
       USDC    USDC (Arc native, 18 decimal gas)
```

All 4 modules share a common `UsernameRegistry` — creators register once, every module uses the same handle.

## Security

- ERC-8183 compliant (in ACP spirit) job-escrow style
- Protocol fees capped at 10% (currently 2%)
- Permissionless views, access-controlled writes (creator-only mutations)
- Native USDC on Arc (no ERC-20 approval dance)

## Roadmap

### v0.1 ✅ (current)
- [x] 6 core contracts deployed local + public testnet
- [x] TypeScript SDK (end-to-end tested, all 4 modes)
- [x] CLI with 5 templates
- [x] Dashboard (register, stats, quick actions)
- [x] Landing page

### v0.2 (next)
- [ ] Full subscription management UI
- [ ] Content paywall UI with IPFS integration
- [ ] API endpoint registration UI
- [ ] Embed widget (JS snippet for any site)
- [ ] Python SDK
- [ ] Nextra docs site
- [ ] Hosted backend (email signup + Circle Wallets)
- [ ] Webhook support

### v0.3
- [ ] Creator NFT gating
- [ ] Multi-currency (EURC)
- [ ] Cross-chain USDC via CCTP
- [ ] Yield integration (when USYC / Aave / Ondo on Arc)
- [ ] AI agent wallet flows
- [ ] Subscription lock-in (token-gated tiers)

### v1.0
- [ ] Multi-sig / DAO support
- [ ] Mobile app
- [ ] Audit + production launch on Arc mainnet

## Alignment with Arc Network

ArcPay is built for Arc's stated use cases from [docs.arc.network](https://docs.arc.network):
- ✅ **P2P payment systems requiring instant, low-cost transfers**
- ✅ **Autonomous AI agents that coordinate, contract, and settle value in real time**
- ✅ **Stablecoin-native programmable money**

And adheres to Arc's 5 core tenets:
- Purpose-built for stablecoin finance
- Open and composable
- Market-neutral (Arc first, multichain via CCTP planned)
- Built to coordinate, not control
- Transparent, trust-minimized

## Fee economics

- **Protocol fee: 2%** of each payment (configurable 0-10% by admin, per-module)
- Creator keeps **98%** (vs Patreon 88-92%, Substack 87%)
- Gas paid in USDC (negligible on Arc, ~$0.0001/tx)

At 1000 creators × $500 monthly GMV × 2% = **$10k MRR** protocol revenue.

## License

MIT — do whatever you want, no warranty.

## Built by

Solo founder on Arc. Grown from [ArcRouter](../arcrouter) (AI API marketplace pivot) to the broader ArcPay vision. Claude Code-assisted development. ~1 day to MVP including deployment + SDK + dashboard.

---

*Arc Testnet live. Mainnet coming 2026. Build the future of USDC payments with us.*
