// LIVE run on Arc testnet: real USDC settlement, end to end.
//
//   tsx scripts/live.ts ["<goal>"] [budgetWei]
//
// - Sellers (3 funded testnet accounts) register a username + a PayPerCall endpoint
//   (idempotent), then serve over local HTTP gated by the on-chain receipt.
// - Buyer (a funded testnet account) runs the agent and pays each endpoint for real;
//   every call is an on-chain Paid tx you can open on arcscan.
//
// Keys are read at runtime from C:/Users/ASUS/arc-accounts/account<N>/.env and never
// leave that folder (nothing here is committed).

import { readFileSync } from "node:fs";
import { keccak256, toBytes } from "viem";
import { payPerCallAbi } from "../src/abi.ts";
import { publicClient, walletFor, payPerCallAddress, networkConfig } from "../src/chain.ts";
import { createSellerService } from "../src/seller.ts";
import { runBuyer, type ExecuteCall } from "../src/agent.ts";
import { deterministicChooser } from "../src/decide.ts";
import { llmChooser, loadApiKey } from "../src/llm.ts";
import { SELLER_SPECS } from "../src/sellers.ts";
import { payAndCall } from "../src/buyer.ts";
import type { Catalog } from "../src/catalog.ts";

const ACCOUNTS_DIR = "C:/Users/ASUS/arc-accounts";
const NETWORK = "testnet" as const;
const EXPLORER = networkConfig(NETWORK).explorer; // https://testnet.arcscan.app
const REGISTRY = networkConfig(NETWORK).addresses.registry;
const PAYPERCALL = payPerCallAddress(NETWORK);

const registryAbi = [
  { type: "function", name: "exists", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getPayoutAddress", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ type: "address" }] },
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "username", type: "string" }, { name: "displayName", type: "string" }, { name: "metadataURI", type: "string" }], outputs: [] },
] as const;

type Acct = { pk: `0x${string}`; address: `0x${string}` };
function loadAccount(n: number): Acct {
  const env = readFileSync(`${ACCOUNTS_DIR}/account${n}/.env`, "utf8");
  const pk = env.match(/^PRIVATE_KEY=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  const address = env.match(/^ADDRESS=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  if (!pk || !address) throw new Error(`account${n}: missing PRIVATE_KEY/ADDRESS`);
  return { pk, address };
}

// service -> seller account + a unique username + local port
const SELLERS = [
  { service: "summarize", acct: 1000, username: "obol-sum-1000", port: 7901 },
  { service: "classify", acct: 1002, username: "obol-cls-1002", port: 7902 },
  { service: "price-lookup", acct: 1003, username: "obol-prc-1003", port: 7903 },
] as const;
const BUYER_ACCT = 1001;

const endpointIdOf = (username: string, name: string) => keccak256(toBytes(`${username}:${name}`));

async function ensureRegistered(s: (typeof SELLERS)[number]) {
  const spec = SELLER_SPECS.find((x) => x.name === s.service)!;
  const acct = loadAccount(s.acct);
  const wallet = walletFor(acct.pk, NETWORK);
  const pub = publicClient(NETWORK);

  // 1) username
  const exists = (await pub.readContract({ address: REGISTRY, abi: registryAbi, functionName: "exists", args: [s.username] })) as boolean;
  if (!exists) {
    const tx = await wallet.writeContract({ address: REGISTRY, abi: registryAbi, functionName: "register", args: [s.username, `Obol ${s.service}`, ""] });
    await pub.waitForTransactionReceipt({ hash: tx });
    console.log(`  registered username ${s.username}  (${EXPLORER}/tx/${tx})`);
  } else {
    console.log(`  username ${s.username} already registered`);
  }

  // 2) endpoint
  const endpointId = endpointIdOf(s.username, s.service);
  const ep = (await pub.readContract({ address: PAYPERCALL, abi: payPerCallAbi, functionName: "getEndpoint", args: [endpointId] })) as { creatorHash: `0x${string}` };
  if (ep.creatorHash === `0x${"00".repeat(32)}`) {
    const tx = await wallet.writeContract({ address: PAYPERCALL, abi: payPerCallAbi, functionName: "registerEndpoint", args: [s.username, s.service, spec.priceWei] });
    await pub.waitForTransactionReceipt({ hash: tx });
    console.log(`  registered endpoint ${s.service} @ ${spec.priceWei} wei  (${EXPLORER}/tx/${tx})`);
  } else {
    console.log(`  endpoint ${s.service} already registered`);
  }

  // 3) local seller service, receipt-gated
  const server = createSellerService({
    name: s.service,
    capability: spec.capability,
    endpointId,
    priceWei: spec.priceWei.toString(),
    network: NETWORK,
    handle: spec.handle,
  });
  await new Promise<void>((r) => server.listen(s.port, r));

  return {
    server,
    service: { name: s.service, capability: spec.capability, endpointId, priceWei: spec.priceWei, sellerUrl: `http://127.0.0.1:${s.port}` },
  };
}

async function main() {
  const goal = process.argv[2] ?? "look up the price of ETH, then classify the sentiment of: Arc nanopayments are amazing";
  const budgetWei = BigInt(process.argv[3] ?? "1000");
  const buyer = loadAccount(BUYER_ACCT);

  console.log(`\nObol LIVE on Arc testnet`);
  console.log(`buyer ${buyer.address} (account${BUYER_ACCT})`);
  console.log(`brain: ${loadApiKey() ? "LLM (Claude)" : "deterministic"}\n`);

  console.log("setup sellers:");
  const started = [];
  for (const s of SELLERS) started.push(await ensureRegistered(s));
  const catalog: Catalog = started.map((x) => x.service);

  console.log(`\ngoal: ${goal}\nbudget: ${budgetWei} wei`);
  console.log("catalog:", catalog.map((s) => `${s.name}(${s.priceWei})`).join("  "), "\n");

  // Real on-chain executor: pay the endpoint, log the arcscan tx, then call the seller.
  const execute: ExecuteCall = async (service, input) => {
    const { callId, txHash, result } = await payAndCall({
      buyerPk: buyer.pk, buyerAddress: buyer.address,
      endpointId: service.endpointId, sellerUrl: service.sellerUrl, input, network: NETWORK,
    });
    console.log(`    paid tx ${EXPLORER}/tx/${txHash}  (callId ${callId})`);
    return { result, costWei: service.priceWei };
  };

  const state = await runBuyer({
    goal, budgetWei, catalog,
    chooser: loadApiKey() ? llmChooser() : deterministicChooser(),
    execute,
    onStep: (st, note) => console.log(`  · ${note}   [spent ${st.spentWei}/${st.budgetWei}]`),
  });

  console.log("\nsettled on Arc testnet:");
  for (const h of state.history) {
    console.log(`  paid ${h.costWei} wei -> ${h.service} -> ${JSON.stringify(h.result)}`);
  }
  console.log(`\ntotal: ${state.spentWei} wei across ${state.history.length} on-chain calls`);
  console.log(`buyer activity: ${EXPLORER}/address/${buyer.address}\n`);

  for (const x of started) x.server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
