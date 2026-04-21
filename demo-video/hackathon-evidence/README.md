# ArcPay — Hackathon Evidence Pack

Evidence for the lablab.ai *Agentic Economy on Arc* hackathon submission requirements.

## Requirements × Status

| Rule | Threshold | ArcPay | Proof |
|---|---|---|---|
| Per-action pricing | ≤ $0.01 USDC | **$0.001 USDC / call** (10× under) | `ai-fe` endpoint registered on PayPerCall contract, price read from chain |
| On-chain tx count | ≥ 50 demo txs | **54 txs across 5 contracts** | Arcscan API count + screenshots below |
| Margin rationale | Must explain why traditional gas fails | Written into long description | See submission body |

## On-chain activity (Arc Testnet — chainId 5042002)

| Contract | Address | Txs | Key methods |
|---|---|---:|---|
| tipJar | `0x45daE58fB5b89C4E994216D2af0B73232641DF3B` | 6 | `tip()` |
| tipJarByHandle | `0x291b86d46027f734cF43Eca9BA2394F46dcd529C` | 30 | `tipByHandle()` × 28 |
| subscriptions | `0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380` | 7 | `subscribe` × 4, `cancel` × 1 |
| contentPaywall | `0x680884124F21939548Ba7f982B4F275A55783484` | 5 | `purchase` × 3 |
| payPerCall | `0x3a399A310965A5cbD5a2B9F21a3B9885B6372def` | 6 | `batchPay` × 4 → 60 individual calls |
| **TOTAL** | | **54** | All 4 payment primitives exercised |

### PayPerCall compression highlight

The PayPerCall contract shows **6 on-chain txs** but **60 logical API calls**. Why? `batchPay(endpointId, 10)` spends one tx to prepay 10 calls; the contract emits a `CallPaid` event for each. This is the economic magic of Arc-native nanopayments:

- **1 tx → 10 credits → 10 discrete $0.001 calls** = $0.01 total on-chain cost
- Each call is a wallet signature verified off-chain, settled on-chain when claimed
- Users pay a single gas overhead for many-call sessions

The `Logs 50+` counter on the PayPerCall Arcscan page verifies this — more emitted events than direct transactions.

## Screenshots

- `arcscan-payPerCall.png` — PayPerCall contract page: 6 txs + "Logs 50+" badge
- `arcscan-tipJarByHandle.png` — TipJarByHandle contract: 30 user txs

## Tx log (JSON)

`batch-txs.json` — every tx fired by the hackathon prep batch script, with account + mode + hash. Verifiable on Arcscan.

## Margin explanation

Ethereum L1 today averages $0.50–$5 per call in gas. Even cheap L2s like Base or Arbitrum land at $0.001–$0.05. An AI agent doing 1,000 inference calls a day at $0.001/call each would spend:

| Chain | Gas per call | 1,000-call daily gas cost |
|---|---|---|
| Ethereum L1 | $0.50–$5 | **$500–$5,000** |
| Base / Arbitrum | $0.001–$0.05 | $1–$50 |
| **Arc** | **$0.0001–$0.001** (USDC-denominated, predictable) | **$0.10–$1** |

ArcPay's 0.001 USDC/call pricing would be 99% gas on Ethereum, 5–95% gas on L2s, **< 50% gas** on Arc — which is why nanopayment agent commerce has an economic model here that simply doesn't exist on other chains. Arc's native USDC gas eliminates the two-token dance (ETH for gas + USDC for payment), and settlement in < 1 s removes the need for off-chain pooled custody or reconciliation delay.

---

_Generated 2026-04-21 for the lablab.ai hackathon submission._
