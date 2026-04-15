# {{projectName}}

Paid API (x402) on Arc Network — charge USDC per API call, built with ArcPay.

## How it works
1. Register your endpoint on-chain with a price
2. Clients pay `PayPerCall.pay(endpointId)` before calling
3. Your server verifies the on-chain payment and serves the response

## Quick start
```bash
npm install
cp .env.example .env
# Edit .env: set CREATOR_USERNAME, ENDPOINT_NAME, PROVIDER_PRIVATE_KEY
npm run dev
```

Server runs on http://localhost:3402. Example call (after on-chain payment):
```bash
curl -X POST http://localhost:3402/call \
  -H "Content-Type: application/json" \
  -d '{"callId": 0, "txHash": "0x...", "input": "hello"}'
```
