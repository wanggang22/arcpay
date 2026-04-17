# ArcPay

**USDC payments, programmable like the internet.**

🌐 **Live**: [arcpay.finance](https://arcpay.finance) · [app.arcpay.finance](https://app.arcpay.finance) · [docs.arcpay.finance](https://docs.arcpay.finance)

Tips, subscriptions, paywalls, and pay-per-call billing on Arc Network. 2% fee. No Stripe account required. Native USDC gas — no separate gas token to manage.

---

## What it is

ArcPay is a **payments primitive** for Arc Network that serves:

- **Developers** — SDK, CLI, templates to build payment features in 5 minutes
- **Creators** — hosted service to accept USDC tips, subscriptions, paywalls
- **Anyone with a payment link** — `arcpay.finance/yourname` works globally

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
   - Register your username, share `arcpay.finance/yourname`, receive USDC.
   - **Tip-by-handle**: even if the recipient hasn't registered, tips are held on-chain
     and they can claim later via X OAuth.
2. **📅 Subscriptions** — Monthly/yearly with auto-prorated refund on cancel.
3. **🔒 Content Paywall** — Gate articles, videos, courses with USDC.
4. **⚡ Pay-per-call** — x402-compatible API billing. Perfect for AI agents.
   - `batchPay(endpointId, N)` prepays N call credits in one transaction.
   - SDK auto-signs each API request with the payer's wallet; servers verify on-chain.

## Distribution surfaces

ArcPay is a **protocol** with multiple ways to surface it to end users:

| Surface | Who uses it | How |
|---|---|---|
| **arcpay.finance/@handle** | Everyone | Share your URL anywhere |
| **Embed widget** | Bloggers, Substack, Notion, README owners | iframe / JS / SVG badge |
| **Chrome extension** | Anyone on X (Twitter) | Injects 💸 Tip button under every tweet |
| **Creator dashboard** | Registered creators | Manage plans/content/endpoints, withdraw |
| **Python/TS SDK** | Developers, AI agents | Programmatic integration |
| **CLI `create-arc-app`** | Devs starting a new app | Scaffold a working template |

## Quick start

### As a developer (SDK)

```bash
# The SDK is in this monorepo at sdk/js. A published @arcpay/sdk on npm
# is planned post-hackathon. For now, install from source:
git clone https://github.com/wanggang22/arcpay
cd arcpay/sdk/js
npm install && npm run build
# Then reference as a local file dependency in your project:
#   npm install /path/to/arcpay/sdk/js
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

1. Visit [app.arcpay.finance](https://app.arcpay.finance) (or run locally)
2. Connect wallet
3. Claim your username (e.g., `alice`)
4. Share your link: `arcpay.finance/alice`
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
Canonical source: [`contracts/deployments/current.json`](./contracts/deployments/current.json)

- ArcPayHub:        `0x79ab5a4B2770BF087aF2fF4CEdb0E67A413bf293`
- UsernameRegistry: `0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb`
- TipJar:           `0x45daE58fB5b89C4E994216D2af0B73232641DF3B`
- TipJarByHandle:   `0x291b86d46027f734cF43Eca9BA2394F46dcd529C` (Chrome ext + claim flow)
- Subscriptions:    `0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380`
- ContentPaywall:   `0x680884124F21939548Ba7f982B4F275A55783484`
- PayPerCall:       `0x3a399A310965A5cbD5a2B9F21a3B9885B6372def` (v2, with batchPay)

Explorer: [testnet.arcscan.app](https://testnet.arcscan.app)

**Redeploying contracts?** Edit `contracts/deployments/current.json`, then run
`node scripts/sync-addresses.mjs` from repo root — it regenerates
`landing/lib/addresses.generated.ts` and `dashboard/lib/addresses.generated.ts`
so every frontend picks up the new addresses automatically.

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
├── contracts/      # Solidity (Foundry) — 7 contracts + deployment scripts
│   ├── src/UsernameRegistry.sol
│   ├── src/TipJar.sol              # classic username-addressed tips
│   ├── src/TipJarByHandle.sol      # NEW — tip X handles with pending claim
│   ├── src/Subscriptions.sol
│   ├── src/ContentPaywall.sol
│   ├── src/PayPerCall.sol          # w/ batchPay for AI agents
│   └── src/ArcPayHub.sol
├── sdk/
│   ├── js/                          # @arcpay/sdk (TypeScript)
│   └── python/                      # arcpay-sdk (Python, for AI agents)
├── cli/                             # create-arc-app CLI + 5 templates
├── landing/                         # arcpay.finance — public site + OAuth + /claim
│   └── app/
│       ├── [username]/              # creator page (4 tabs)
│       ├── claim/                   # X OAuth → attestation → claim
│       ├── embed/tip/[username]/    # iframe embed
│       ├── badge/[username]/        # SVG badge endpoint
│       ├── api/og/                  # Open Graph image generator
│       ├── api/x-profile/           # Bearer-token X profile fetch
│       └── api/auth/twitter/        # OAuth 2.0 PKCE flow
├── dashboard/                       # app.arcpay.finance — creator dashboard
│   └── app/
│       ├── tips, subscriptions, content, api, activity/
│       └── embed/                   # NEW — copy-paste snippets
├── extension/                       # NEW — Chrome Manifest V3 extension
│   ├── manifest.json
│   ├── content.js                   # injects Tip btn into x.com tweets
│   ├── styles.css
│   └── popup.html
├── server/                          # (reserved)
└── docs/                            # docs.arcpay.finance
```

## 🧩 Embed ArcPay anywhere

Every creator can paste these snippets on their own surfaces:

**iframe** (Notion / Substack / blog / WordPress):
```html
<iframe src="https://arcpay.finance/embed/tip/YOUR_NAME"
  width="420" height="320" style="border:0"></iframe>
```

**JS SDK** (auto-render inline):
```html
<script src="https://arcpay.finance/embed.js" defer></script>
<div data-arcpay="tip" data-user="YOUR_NAME"></div>
```

**JS SDK — button mode** (opens modal):
```html
<button data-arcpay-button data-user="YOUR_NAME">💸 Tip me</button>
```

**GitHub README badge**:
```markdown
[![Tip on ArcPay](https://arcpay.finance/badge/YOUR_NAME.svg)](https://arcpay.finance/YOUR_NAME)
```

## 🐦 Chrome extension — Tip anyone on X

Install the extension and every tweet gets a 💸 **Tip** button next to reply/retweet. Clicking opens `arcpay.finance/@handle` in a new tab for the viewer to complete the tip with email or wallet login.

**Install (dev mode)**:
1. Open `chrome://extensions` → toggle Developer mode
2. Click "Load unpacked" → select the `extension/` folder
3. Visit [x.com](https://x.com) — tip buttons appear

**For recipients without a wallet yet**: tips are held on-chain in `TipJarByHandle` keyed by your X handle. You can claim anytime at [arcpay.finance/claim](https://arcpay.finance/claim) — sign in with X OAuth → connect the wallet you want the USDC sent to → one click claim.

## 🎁 Claim flow

1. Someone tipped your X handle before you joined ArcPay.
2. Visit `arcpay.finance/claim`.
3. Connect any wallet (email login via Privy, or external wallet).
4. Click **Sign in with X** — OAuth 2.0 PKCE flow.
5. Our backend verifies you own the handle, signs an EIP-191 attestation:
   `keccak256("ArcPayHandleClaim" || chainId || contract || handle || recipient || deadline)`
6. You submit the attestation to `TipJarByHandle.claimByHandle()` on-chain.
7. USDC lands in your connected wallet. Trustless: the contract verifies the attestation signer matches the expected backend key.

Attestations expire in 10 minutes and are bound to a specific recipient address — front-running is impossible.

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

### v0.1 ✅
- [x] 6 core contracts deployed local + public testnet
- [x] TypeScript SDK (end-to-end tested, all 4 modes)
- [x] CLI with 5 templates
- [x] Dashboard (register, stats, quick actions)
- [x] Landing page

### v0.2 ✅
- [x] Full subscription management UI
- [x] Content paywall UI with preview + unlock badges
- [x] API endpoint registration UI
- [x] Python SDK
- [x] Privy email/social login (email, Google, Twitter, Discord, Farcaster, GitHub)
- [x] Arcscan tx/address links, Recent supporters wall (social proof)

### v0.3 ✅ (hackathon — Agentic Economy on Arc)
- [x] `PayPerCall.batchPay()` — prepay N API call credits in 1 tx (AI-agent friendly)
- [x] `TipJarByHandle` — tip any X handle, pending on-chain claim via OAuth
- [x] Chrome extension — 💸 Tip button injected into every tweet on x.com
- [x] Embed widgets — iframe, JS SDK (auto/button), SVG badge
- [x] OG preview cards + X profile auto-fetch (Bearer Token)
- [x] `/claim` flow with EIP-191 attestation (backend-signed, on-chain verified)

### v1.0 roadmap
- [ ] Mainnet deployment
- [ ] Subscription upgrade/downgrade flows
- [ ] Handle-based Subscribe + Content (not just Tip)
- [ ] Publish extension to Chrome Web Store
- [ ] MCP server for AI agents to discover + pay endpoints
- [ ] Recurring agent-to-agent payments (streaming, conditional)
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
