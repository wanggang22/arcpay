# Obol Phase 1 — Receipt-Gated Paid Agent Call (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buyer agent pays a seller agent's `PayPerCall` endpoint in native USDC on Arc, and the seller serves the result *only after verifying the on-chain receipt*. End-to-end, tested against a local Arc chain.

**Architecture:** A thin TypeScript `obol/` workspace on top of the existing ArcPay repo. Buyer sends `pay(endpointId){value: price}` → reads `callId` from the `Paid` event → calls the seller's HTTP service with that `callId` → seller verifies via `getReceipt(callId)` (correct endpoint, correct payer, unconsumed) before returning a result. Reuses the already-deployed `PayPerCall` contract; no contract changes.

**Tech Stack:** TypeScript, `tsx`, Node built-in `node:test`, `viem` (chain reads/writes + event log parsing), Node built-in `http` (seller service). Local chain via the repo's existing local deploy (chainId 1337). LLM is **not** in Phase 1 (added in Phase 2).

---

## Why this slice first
The on-chain *pay → read callId from event → receipt-gated serve* loop is the riskiest and most novel integration. Proving it end-to-end de-risks everything else (LLM buyer brain, discovery, more sellers, traction feed all sit on top of this primitive).

## File structure (Phase 1)

| File | Responsibility |
|---|---|
| `obol/package.json` | Workspace deps (`viem`, `tsx`, types) + scripts. |
| `obol/tsconfig.json` | TS config (ESM, strict). |
| `obol/src/chain.ts` | viem public + wallet clients; load chain config + `PayPerCall` address/ABI from repo deployments. |
| `obol/src/abi.ts` | Minimal `PayPerCall` ABI fragment (the functions/events Obol uses). |
| `obol/src/payments.ts` | `getEndpoint`, `pay`, `parseCallIdFromReceipt`, `getReceipt`, `verifyReceipt`. |
| `obol/src/seller.ts` | `createSellerService()` — Node http server: `/.well-known/obol.json` + `POST /serve`. |
| `obol/src/buyer.ts` | `payAndCall()` — pay endpoint, get callId, call seller, return result. |
| `obol/test/payments.test.ts` | Unit tests for `verifyReceipt` + `parseCallIdFromReceipt`. |
| `obol/test/e2e.test.ts` | Integration: real local-chain pay → serve loop. |
| `obol/README.md` | How to run Phase 1 locally. |

---

### Task 1: Scaffold the `obol/` workspace

**Files:**
- Create: `obol/package.json`, `obol/tsconfig.json`, `obol/.gitignore`

- [ ] **Step 1: Create `obol/package.json`**

```json
{
  "name": "obol",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --import tsx --test test/**/*.test.ts",
    "seller": "tsx src/run-seller.ts",
    "buyer": "tsx src/run-buyer.ts"
  },
  "dependencies": {
    "viem": "^2.21.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `obol/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `obol/.gitignore`**

```
node_modules/
.env
*.local
```

- [ ] **Step 4: Install + verify**

Run: `cd obol && npm install`
Expected: installs without errors; `node_modules/` present.

- [ ] **Step 5: Commit**

```bash
git add obol/package.json obol/tsconfig.json obol/.gitignore
git commit -m "feat(obol): scaffold agent-layer workspace (Phase 1)"
```

---

### Task 2: PayPerCall ABI fragment + chain clients

**Files:**
- Create: `obol/src/abi.ts`, `obol/src/chain.ts`
- Reference: `contracts/src/PayPerCall.sol`, `contracts/deployments/current.json`

- [ ] **Step 1: Extract the exact ABI during execution.** Read `contracts/out/PayPerCall.sol/PayPerCall.json` (Foundry build artifact) if present, else compile (`cd contracts && forge build`). Copy ONLY these items into `obol/src/abi.ts` as a `const payPerCallAbi = [...] as const`:
  - functions: `getEndpoint(bytes32)`, `getEndpointByName(string,string)`, `pay(bytes32) payable returns (uint256)`, `getReceipt(uint256)`
  - event: `Paid(uint256 indexed callId, bytes32 indexed endpointId, address indexed payer, uint256 amount)`
  - structs returned by `getEndpoint`/`getReceipt` (mirror `Endpoint` and `CallReceipt` from the .sol)

Write the file with the literal ABI array (no placeholder — paste the real fragment).

- [ ] **Step 2: Create `obol/src/chain.ts`**

```ts
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

// Local Arc dev chain (anvil). Testnet config added in a later phase.
export const arcLocal = defineChain({
  id: 1337,
  name: "Arc Local",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC ?? "http://127.0.0.1:8545"] } },
});

export function loadPayPerCallAddress(): `0x${string}` {
  const dep = JSON.parse(readFileSync(new URL("../../contracts/deployments/current.json", import.meta.url), "utf8"));
  // current.json maps contract name -> address; adjust key during execution to match the file's shape.
  const addr = dep.PayPerCall ?? dep.local?.PayPerCall;
  if (!addr) throw new Error("PayPerCall address not found in deployments/current.json");
  return addr as `0x${string}`;
}

export function publicClient() {
  return createPublicClient({ chain: arcLocal, transport: http() });
}

export function walletFor(pk: `0x${string}`) {
  return createWalletClient({ account: privateKeyToAccount(pk), chain: arcLocal, transport: http() });
}
```

- [ ] **Step 3: Type-check**

Run: `cd obol && npx tsc --noEmit`
Expected: no errors (after pasting the real ABI in Step 1).

- [ ] **Step 4: Commit**

```bash
git add obol/src/abi.ts obol/src/chain.ts
git commit -m "feat(obol): PayPerCall ABI fragment + viem chain clients"
```

---

### Task 3: Payments module — pay, parse callId from event, verify receipt

**Files:**
- Create: `obol/src/payments.ts`
- Test: `obol/test/payments.test.ts`

- [ ] **Step 1: Write the failing test** (`obol/test/payments.test.ts`)

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCallIdFromLogs, verifyReceipt } from "../src/payments.ts";
import { payPerCallAbi } from "../src/abi.ts";
import { encodeEventTopics, encodeAbiParameters } from "viem";

test("parseCallIdFromLogs extracts callId from a Paid event", () => {
  const endpointId = "0x" + "11".repeat(32) as `0x${string}`;
  const payer = "0x" + "22".repeat(20) as `0x${string}`;
  const topics = encodeEventTopics({
    abi: payPerCallAbi, eventName: "Paid",
    args: { callId: 7n, endpointId, payer },
  });
  const data = encodeAbiParameters([{ type: "uint256" }], [1000n]); // amount
  const callId = parseCallIdFromLogs([{ address: "0x" + "33".repeat(20), topics, data } as any]);
  assert.equal(callId, 7n);
});

test("verifyReceipt rejects wrong payer", () => {
  const receipt = { endpointId: "0xaa", payer: "0xBOB", consumed: false } as any;
  assert.equal(verifyReceipt(receipt, { endpointId: "0xaa", expectedPayer: "0xALICE" }), false);
});

test("verifyReceipt accepts matching unconsumed receipt", () => {
  const receipt = { endpointId: "0xaa", payer: "0xALICE", consumed: false } as any;
  assert.equal(verifyReceipt(receipt, { endpointId: "0xaa", expectedPayer: "0xALICE" }), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd obol && npm test`
Expected: FAIL ("Cannot find module '../src/payments.ts'").

- [ ] **Step 3: Write minimal implementation** (`obol/src/payments.ts`)

```ts
import { decodeEventLog, parseEventLogs, type Log } from "viem";
import { payPerCallAbi } from "./abi.ts";
import { publicClient } from "./chain.ts";

export function parseCallIdFromLogs(logs: Log[]): bigint {
  const events = parseEventLogs({ abi: payPerCallAbi, eventName: "Paid", logs });
  if (!events.length) throw new Error("no Paid event in logs");
  return (events[0] as any).args.callId as bigint;
}

export type CallReceipt = { endpointId: `0x${string}`; payer: `0x${string}`; consumed: boolean };

export function verifyReceipt(
  r: CallReceipt,
  expect: { endpointId: string; expectedPayer: string },
): boolean {
  return (
    r.endpointId.toLowerCase() === expect.endpointId.toLowerCase() &&
    r.payer.toLowerCase() === expect.expectedPayer.toLowerCase() &&
    r.consumed === false
  );
}

// On-chain helpers (used by buyer/seller; covered by e2e in Task 6).
export async function getReceipt(payPerCall: `0x${string}`, callId: bigint): Promise<CallReceipt> {
  const c = publicClient();
  const raw = await c.readContract({ address: payPerCall, abi: payPerCallAbi, functionName: "getReceipt", args: [callId] }) as any;
  return { endpointId: raw.endpointId, payer: raw.payer, consumed: raw.consumed ?? false };
}
```

Note during execution: align `CallReceipt` field names (`endpointId`/`payer`/`consumed`) with the real `CallReceipt` struct in `PayPerCall.sol`. If the struct lacks a `consumed` flag, drop that check and rely on (payer,endpointId) match — adjust both impl and tests together.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd obol && npm test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add obol/src/payments.ts obol/test/payments.test.ts
git commit -m "feat(obol): payments — parse callId from Paid event + verifyReceipt"
```

---

### Task 4: `pay()` helper (send native-USDC payment, return callId)

**Files:**
- Modify: `obol/src/payments.ts`

- [ ] **Step 1: Add `payEndpoint` to `obol/src/payments.ts`**

```ts
import { walletFor, publicClient } from "./chain.ts";

export async function getEndpointPrice(payPerCall: `0x${string}`, endpointId: `0x${string}`): Promise<bigint> {
  const c = publicClient();
  const ep = await c.readContract({ address: payPerCall, abi: payPerCallAbi, functionName: "getEndpoint", args: [endpointId] }) as any;
  return ep.price as bigint;
}

export async function payEndpoint(
  buyerPk: `0x${string}`, payPerCall: `0x${string}`, endpointId: `0x${string}`,
): Promise<{ callId: bigint; txHash: `0x${string}` }> {
  const wallet = walletFor(buyerPk);
  const c = publicClient();
  const price = await getEndpointPrice(payPerCall, endpointId);
  const txHash = await wallet.writeContract({
    address: payPerCall, abi: payPerCallAbi, functionName: "pay", args: [endpointId], value: price,
  });
  const receipt = await c.waitForTransactionReceipt({ hash: txHash });
  const callId = parseCallIdFromLogs(receipt.logs);
  return { callId, txHash };
}
```

- [ ] **Step 2: Type-check**

Run: `cd obol && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add obol/src/payments.ts
git commit -m "feat(obol): payEndpoint — native-USDC pay returns callId"
```

---

### Task 5: Seller service (receipt-gated serving)

**Files:**
- Create: `obol/src/seller.ts`

- [ ] **Step 1: Create `obol/src/seller.ts`**

```ts
import { createServer } from "node:http";
import { getReceipt, verifyReceipt } from "./payments.ts";

export type SellerConfig = {
  name: string;                       // service name (also the PayPerCall endpoint "name")
  capability: string;                 // human/LLM-readable description
  endpointId: `0x${string}`;
  priceWei: string;
  payPerCall: `0x${string}`;
  handle: (input: unknown) => Promise<unknown>;   // the actual micro-service
};

export function createSellerService(cfg: SellerConfig) {
  return createServer(async (req, res) => {
    if (req.method === "GET" && req.url?.startsWith("/.well-known/obol.json")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        name: cfg.name, capability: cfg.capability,
        endpointId: cfg.endpointId, priceWei: cfg.priceWei,
      }));
      return;
    }
    if (req.method === "POST" && req.url?.startsWith("/serve")) {
      const url = new URL(req.url, "http://localhost");
      const callId = BigInt(url.searchParams.get("callId") ?? "0");
      const payer = url.searchParams.get("payer") ?? "";
      const receipt = await getReceipt(cfg.payPerCall, callId);
      if (!verifyReceipt(receipt, { endpointId: cfg.endpointId, expectedPayer: payer })) {
        res.writeHead(402, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "payment required / receipt invalid" }));
        return;
      }
      const body = await readJson(req);
      const result = await cfg.handle(body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ callId: callId.toString(), result }));
      return;
    }
    res.writeHead(404); res.end();
  });
}

function readJson(req: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let data = ""; req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd obol && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add obol/src/seller.ts
git commit -m "feat(obol): seller service with on-chain receipt gate (HTTP 402 until paid)"
```

---

### Task 6: Buyer `payAndCall` + end-to-end test on local chain

**Files:**
- Create: `obol/src/buyer.ts`, `obol/test/e2e.test.ts`

- [ ] **Step 1: Create `obol/src/buyer.ts`**

```ts
import { payEndpoint } from "./payments.ts";

export async function payAndCall(opts: {
  buyerPk: `0x${string}`; buyerAddress: `0x${string}`;
  payPerCall: `0x${string}`; endpointId: `0x${string}`;
  sellerUrl: string; input: unknown;
}): Promise<{ callId: bigint; txHash: `0x${string}`; result: unknown }> {
  const { callId, txHash } = await payEndpoint(opts.buyerPk, opts.payPerCall, opts.endpointId);
  const res = await fetch(`${opts.sellerUrl}/serve?callId=${callId}&payer=${opts.buyerAddress}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(opts.input),
  });
  if (!res.ok) throw new Error(`seller refused: ${res.status} ${await res.text()}`);
  const { result } = await res.json();
  return { callId, txHash, result };
}
```

- [ ] **Step 2: Write the e2e test** (`obol/test/e2e.test.ts`)

This test requires a local Arc chain with `PayPerCall` deployed and a registered endpoint. The test (a) starts an anvil-backed local chain via the repo's deploy, (b) registers an `echo` endpoint, (c) starts the seller, (d) runs `payAndCall`, (e) asserts the echoed result and that an unpaid call is rejected with 402. Document exact setup in the test header; gate it behind `process.env.E2E === "1"` so unit tests stay fast.

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSellerService } from "../src/seller.ts";
import { payAndCall } from "../src/buyer.ts";
import { loadPayPerCallAddress } from "../src/chain.ts";

const E2E = process.env.E2E === "1";

test("e2e: unpaid call is rejected, paid call is served", { skip: !E2E }, async () => {
  // Preconditions (documented for the executor):
  //  - anvil running, PayPerCall deployed (repo local deploy), addr in current.json
  //  - env: BUYER_PK, BUYER_ADDR, SELLER_ENDPOINT_ID (registered echo endpoint)
  const payPerCall = loadPayPerCallAddress();
  const endpointId = process.env.SELLER_ENDPOINT_ID as `0x${string}`;
  const seller = createSellerService({
    name: "echo", capability: "echoes input", endpointId,
    priceWei: "1000", payPerCall, handle: async (i) => i,
  });
  await new Promise<void>((r) => seller.listen(7801, r));
  try {
    // unpaid: hitting /serve with a bogus callId must 402
    const bad = await fetch("http://127.0.0.1:7801/serve?callId=999999&payer=0x0000000000000000000000000000000000000000", { method: "POST", body: "{}" });
    assert.equal(bad.status, 402);

    // paid: real pay → callId → served
    const out = await payAndCall({
      buyerPk: process.env.BUYER_PK as `0x${string}`,
      buyerAddress: process.env.BUYER_ADDR as `0x${string}`,
      payPerCall, endpointId, sellerUrl: "http://127.0.0.1:7801",
      input: { hello: "obol" },
    });
    assert.deepEqual(out.result, { hello: "obol" });
    assert.ok(out.callId > 0n);
  } finally {
    seller.close();
  }
});
```

- [ ] **Step 3: Bring up local chain + register endpoint, then run e2e**

Document and run (exact commands confirmed during execution against the repo's local deploy):
```bash
# terminal A: local chain
anvil
# terminal B: deploy PayPerCall locally (repo script), register an "echo" endpoint for a known username,
#   capture endpointId, fund BUYER with native test USDC
# then:
cd obol && E2E=1 BUYER_PK=0x... BUYER_ADDR=0x... SELLER_ENDPOINT_ID=0x... npm test
```
Expected: e2e test PASS (402 for unpaid, echoed result for paid).

- [ ] **Step 4: Commit**

```bash
git add obol/src/buyer.ts obol/test/e2e.test.ts
git commit -m "feat(obol): buyer payAndCall + e2e receipt-gated call on local Arc"
```

---

### Task 7: Phase 1 README

**Files:**
- Create: `obol/README.md`

- [ ] **Step 1: Write `obol/README.md`** documenting: what Obol is (one paragraph), Phase 1 scope (the paid-call primitive), how to run unit tests (`npm test`), how to run the e2e (anvil + deploy + env vars), and the roadmap pointer to the spec. No placeholders — include the real commands from Task 6.

- [ ] **Step 2: Commit**

```bash
git add obol/README.md
git commit -m "docs(obol): Phase 1 README — run unit + e2e paid-call loop"
```

---

## Self-review (done)
- **Spec coverage (Phase 1 portion):** seller endpoint + receipt-gated serving (Tasks 5), buyer pay→call (Tasks 4,6), reuse of deployed PayPerCall (Task 2), tests (Tasks 3,6). Discovery, LLM buyer brain, 3 sellers, traction feed, live testnet, demo → **later phases** (roadmap below), by design.
- **Placeholder scan:** the two "confirm during execution" notes (exact ABI in Task 2.1, exact local-deploy commands in Task 6.3) are genuine repo-specific lookups, not hand-waves — each says exactly what to read/run. The `consumed` field caveat (Task 3.3) names the exact adjustment if the struct differs.
- **Type consistency:** `CallReceipt {endpointId, payer, consumed}`, `payEndpoint → {callId, txHash}`, `payAndCall → {callId, txHash, result}`, `SellerConfig.endpointId/priceWei/payPerCall` are used consistently across Tasks 3–6.

## Roadmap (subsequent plans, each its own spec→plan)
- **Phase 2 — Buyer brain:** LLM decision loop (decompose → choose by capability/price/budget → reassess → stop), with a deterministic fallback ranker. The 30%-agentic core.
- **Phase 3 — Discovery + 3 real sellers:** catalog from `/.well-known/obol.json` + on-chain cross-check; `fetch-summarize`, `classify`, `price-lookup` services.
- **Phase 4 — Traction feed:** index `Paid` events → live payments view + arcscan links (reuse ArcPay dashboard surfaces).
- **Phase 5 — Live testnet run + HyperFrames demo:** funded agent wallets, real sub-cent USDC volume during the window, 2–3 min demo video.
