# Narration Script — ArcPay demo v2026-04-21

**Target duration:** 45 seconds (~110 words at 2.5 wps — leaves room for pauses)
**Voice:** confident, precise, editorial. No hype, no "revolutionize." Concrete words only.
**Hook type:** a contrast (four audiences, one URL) rather than a stat.

---

## Narration

```
Four ways to get paid.
One URL.

Arc Pay is the Stripe of U S D C on Arc — for humans and A I agents.

Mode one. Tips. Every tweet gets a tip button. Our Chrome extension injects it right next to reply and retweet.

Mode two. Subscriptions. Like Substack, but creators keep ninety eight percent. Per-second accrual, cancel any time for a prorated refund.

Mode three. Content paywall. Gumroad with an on-chain receipt. Pay once, own forever — even if the store disappears.

Mode four. Pay-per-call. An agent prepays one hundred inference credits in a single transaction. Every call after that is a wallet signature. x four zero two, E R C eight one eight three.

Two percent protocol fee. Zero point five second settlement. Native U S D C gas.

Start building. N P M create arc-app.
```

## Word count + pacing

| Beat | Words | Target seconds |
|---|---:|---:|
| B1 — Hook ("Four ways ... One URL.") | 7 | 4.0 |
| B2 — Positioning ("Arc Pay is the Stripe ...") | 14 | 6.0 |
| B3 — Tips | 18 | 7.5 |
| B4 — Subs | 17 | 7.0 |
| B5 — Paywall | 17 | 7.0 |
| B6 — Pay-per-call (the new v0.1.1 batchPay star) | 26 | 10.0 |
| B7 — Stats ("Two percent ... Native U S D C gas.") | 10 | 4.5 |
| B8 — CTA ("Start building. N P M create arc-app.") | 7 | 4.0 |
| **Total** | **116** | **~50s** |

## Number / acronym pronunciation guide (for TTS)

| On screen | Write / say as |
|---|---|
| USDC | U S D C |
| API | A P I |
| AI | A I |
| SDK | S D K |
| NPM | N P M |
| 2% | two percent |
| 0.5s | zero point five second |
| 98% | ninety eight percent |
| x402 | x four zero two |
| ERC-8183 | E R C eight one eight three |
| 100 (credits) | one hundred |
| arcpay.finance | arc pay dot finance |

## What's different from v2026-04-17

- **Replaces slop positioning line** ("USDC payments for humans and AI agents, on Arc") with the landing's actual headline pair ("Four ways to get paid. One URL.") and the Stripe analogy from the live site.
- **Upgrades Mode 4** from "prepay a hundred calls" (vague) to the exact `batchPay` mechanic: 1 tx of 100 credits, each call is a wallet signature. This is the audible proof that SDK v0.1.1 shipped real `client.api.batchPay(...)`.
- **Adds a stats beat** (2% / 0.5s / native USDC gas) to lock the value prop numerically.
- **CTA points at `npm create arc-app`** — the real working CLI, same copy-line that's on the hero.
