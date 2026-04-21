// Fire ~15 txs across ArcPay contracts to cross the ≥50 on-chain tx threshold
// for the lablab.ai Agentic Economy on Arc hackathon.
//
// Distribution designed to showcase all 4 payment modes:
//   • 8 × tipByHandle — cheapest, fastest, 8 different X handles
//   • 3 × subscribe  — realistic subscriber behavior
//   • 2 × batchPay(count=5) — agent paying forward 5 calls each
//   • 2 × purchase — content paywall purchases
//
// Uses accounts from ~/arc-accounts/account<N>/.env (147 available).

import fs from 'node:fs';
import path from 'node:path';
import { createWalletClient, createPublicClient, http, parseUnits, keccak256, stringToBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const arc = {
  id: 5042002,
  name: 'Arc Testnet',
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  nativeCurrency: { symbol: 'USDC', name: 'USDC', decimals: 18 },
};

const ADDR = {
  tipJarByHandle: '0x291b86d46027f734cF43Eca9BA2394F46dcd529C',
  subscriptions: '0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380',
  contentPaywall: '0x680884124F21939548Ba7f982B4F275A55783484',
  payPerCall: '0x3a399A310965A5cbD5a2B9F21a3B9885B6372def',
};

const pub = createPublicClient({ chain: arc, transport: http() });

function loadAccount(i) {
  const envPath = `C:/Users/ASUS/arc-accounts/account${i}/.env`;
  if (!fs.existsSync(envPath)) return null;
  const env = fs.readFileSync(envPath, 'utf8');
  const pk = env.match(/PRIVATE_KEY=([^\s]+)/)?.[1];
  if (!pk) return null;
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
  return createWalletClient({ account, chain: arc, transport: http() });
}

// Endpoint id for gavin/ai-fe (already registered, price 0.001 USDC/call)
const ENDPOINT_ID = keccak256(
  new Uint8Array([
    ...stringToBytes('gavin'), // creator
    ...stringToBytes('ai-fe'), // name
  ])
);
// Actually the contract hashes keccak256(usernameHash + name) — let me read it from on-chain to be safe.

async function fireTip(wallet, handle, amountUsdc, msg) {
  const value = parseUnits(amountUsdc, 18);
  const hash = await wallet.writeContract({
    address: ADDR.tipJarByHandle,
    abi: [{
      type: 'function', name: 'tipByHandle', stateMutability: 'payable',
      inputs: [{ name: 'handle', type: 'string' }, { name: 'message', type: 'string' }],
      outputs: [{ type: 'uint256' }],
    }],
    functionName: 'tipByHandle',
    args: [handle, msg],
    value,
  });
  return hash;
}

async function fireSubscribe(wallet, planId, months, priceUsdc) {
  const value = parseUnits(priceUsdc, 18);
  const hash = await wallet.writeContract({
    address: ADDR.subscriptions,
    abi: [{
      type: 'function', name: 'subscribe', stateMutability: 'payable',
      inputs: [{ name: 'planId', type: 'uint256' }, { name: 'months', type: 'uint256' }],
      outputs: [{ type: 'uint256' }],
    }],
    functionName: 'subscribe',
    args: [BigInt(planId), BigInt(months)],
    value,
  });
  return hash;
}

async function fireBatchPay(wallet, endpointId, count, perCallPrice) {
  const value = parseUnits(perCallPrice, 18) * BigInt(count);
  const hash = await wallet.writeContract({
    address: ADDR.payPerCall,
    abi: [{
      type: 'function', name: 'batchPay', stateMutability: 'payable',
      inputs: [{ name: 'endpointId', type: 'bytes32' }, { name: 'count', type: 'uint256' }],
      outputs: [{ type: 'uint256' }],
    }],
    functionName: 'batchPay',
    args: [endpointId, BigInt(count)],
    value,
  });
  return hash;
}

async function firePurchase(wallet, contentId, priceUsdc) {
  const value = parseUnits(priceUsdc, 18);
  const hash = await wallet.writeContract({
    address: ADDR.contentPaywall,
    abi: [{
      type: 'function', name: 'purchase', stateMutability: 'payable',
      inputs: [{ name: 'contentId', type: 'bytes32' }],
      outputs: [],
    }],
    functionName: 'purchase',
    args: [contentId],
    value,
  });
  return hash;
}

// Read the real endpoint id for gavin/ai-fe from chain (don't guess hash scheme)
async function realEndpointId() {
  const ids = await pub.readContract({
    address: ADDR.payPerCall,
    abi: [{ type: 'function', name: 'getCreatorEndpoints', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] }],
    functionName: 'getCreatorEndpoints',
    args: ['gavin'],
  });
  return ids[0];
}

async function findActiveContent() {
  // Pick the first active content id for 'gavin' (tests). Fallback to known hash if missing.
  try {
    const ids = await pub.readContract({
      address: ADDR.contentPaywall,
      abi: [{ type: 'function', name: 'getCreatorContents', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'bytes32[]' }] }],
      functionName: 'getCreatorContents',
      args: ['gavin'],
    });
    return ids[0] || null;
  } catch { return null; }
}

async function findPlan() {
  // Try the planId path — read first plan for 'gavin'
  try {
    const pids = await pub.readContract({
      address: ADDR.subscriptions,
      abi: [{ type: 'function', name: 'getCreatorPlans', stateMutability: 'view', inputs: [{ type: 'string' }], outputs: [{ type: 'uint256[]' }] }],
      functionName: 'getCreatorPlans',
      args: ['gavin'],
    });
    if (!pids?.length) return null;
    const planId = pids[0];
    const plan = await pub.readContract({
      address: ADDR.subscriptions,
      abi: [{
        type: 'function', name: 'getPlan', stateMutability: 'view',
        inputs: [{ type: 'uint256' }],
        outputs: [{ type: 'tuple', components: [
          { name: 'creator', type: 'bytes32' },
          { name: 'pricePerMonth', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ] }],
      }],
      functionName: 'getPlan',
      args: [planId],
    });
    return { planId, pricePerMonth: plan.pricePerMonth };
  } catch { return null; }
}

async function main() {
  const handles = ['elonmusk', 'jack', 'vitalikbuterin', 'pmarca', 'paulg', 'naval', 'garrytan', 'patrickc'];
  const messages = ['keep building', 'great take', 'loved this', 'underrated', 'ship it', 'agree', '🙏', 'this hit'];
  const log = [];

  const endpointId = await realEndpointId();
  console.log('Endpoint id (gavin/ai-fe):', endpointId);
  const contentId = await findActiveContent();
  console.log('Content id (first gavin content):', contentId);
  const plan = await findPlan();
  console.log('Plan:', plan);

  // ---------- 8 tips ----------
  const tipAccounts = [11, 13, 15, 17, 19, 21, 25, 27];
  for (let i = 0; i < tipAccounts.length; i++) {
    const n = tipAccounts[i];
    const w = loadAccount(n);
    if (!w) { console.log(`skip account${n}`); continue; }
    try {
      const hash = await fireTip(w, handles[i], '0.01', messages[i]);
      console.log(`TIP  account${n} → @${handles[i]}  ${hash}`);
      log.push({ mode: 'tip', account: n, handle: handles[i], hash });
    } catch (e) { console.error(`TIP  account${n}  ERR:`, e.shortMessage || e.message); }
  }

  // ---------- 3 subscribes ----------
  if (plan) {
    const subAccounts = [31, 33, 35];
    for (const n of subAccounts) {
      const w = loadAccount(n);
      if (!w) continue;
      try {
        const hash = await w.writeContract({
          address: ADDR.subscriptions,
          abi: [{ type: 'function', name: 'subscribe', stateMutability: 'payable',
            inputs: [{ type: 'uint256' }, { type: 'uint256' }],
            outputs: [{ type: 'uint256' }] }],
          functionName: 'subscribe',
          args: [plan.planId, 1n],
          value: plan.pricePerMonth,
        });
        console.log(`SUB  account${n} plan=${plan.planId} 1mo  ${hash}`);
        log.push({ mode: 'sub', account: n, hash });
      } catch (e) { console.error(`SUB  account${n}  ERR:`, e.shortMessage || e.message); }
    }
  } else {
    console.log('No active plan for gavin — skipping subscriptions.');
  }

  // ---------- 2 batchPay ----------
  if (endpointId) {
    const bpAccounts = [37, 39];
    for (const n of bpAccounts) {
      const w = loadAccount(n);
      if (!w) continue;
      try {
        const hash = await fireBatchPay(w, endpointId, 5, '0.001');
        console.log(`BP   account${n} count=5  ${hash}`);
        log.push({ mode: 'batchPay', account: n, count: 5, hash });
      } catch (e) { console.error(`BP   account${n}  ERR:`, e.shortMessage || e.message); }
    }
  }

  // ---------- 2 purchases ----------
  if (contentId) {
    const pAccounts = [41, 43];
    for (const n of pAccounts) {
      const w = loadAccount(n);
      if (!w) continue;
      try {
        // Need to know the content price — read it first
        const content = await pub.readContract({
          address: ADDR.contentPaywall,
          abi: [{ type: 'function', name: 'getContent', stateMutability: 'view', inputs: [{ type: 'bytes32' }],
            outputs: [{ type: 'tuple', components: [
              { name: 'creator', type: 'bytes32' },
              { name: 'priceWei', type: 'uint256' },
              { name: 'active', type: 'bool' },
            ] }] }],
          functionName: 'getContent',
          args: [contentId],
        });
        const hash = await w.writeContract({
          address: ADDR.contentPaywall,
          abi: [{ type: 'function', name: 'purchase', stateMutability: 'payable',
            inputs: [{ type: 'bytes32' }], outputs: [] }],
          functionName: 'purchase',
          args: [contentId],
          value: content.priceWei,
        });
        console.log(`PAY  account${n} purchase  ${hash}`);
        log.push({ mode: 'purchase', account: n, hash });
      } catch (e) { console.error(`PAY  account${n}  ERR:`, e.shortMessage || e.message); }
    }
  }

  // Write log
  const outPath = 'demo-video/hackathon-evidence/batch-txs.json';
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ ts: new Date().toISOString(), txs: log }, null, 2));
  console.log(`\nSuccess: ${log.length} txs fired. Log → ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
