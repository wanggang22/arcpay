// Letta app backend (pool model): a thin HTTP API over LettaPool + the agent. The console
// shows the realistic capital model — an LP funds the pool, the agent underwrites and funds
// advances FROM the pool, and the fee accrues as the LP's yield.
//
//   npm run app   ->   http://localhost:8088
//
// Demo signing model: the server holds the operator / LP / buyer testnet keys (read at
// runtime from arc-accounts, never committed) so the whole flow is one-click. In production,
// LPs / buyers sign in with their own wallet OR with Circle Wallets (email) — see the UI note.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { keccak256, toBytes } from "viem";
import { publicClient, walletFor } from "./src/chain.ts";
import { ADDRESSES, addrUrl } from "./src/config.ts";
import { lettaPoolAbi, payPerCallAbi } from "./src/abi.ts";
import { fetchBuyerHistory } from "./src/history.ts";
import { underwrite, loadApiKey, type Invoice } from "./src/underwrite.ts";
import { circleSignup, circleWallet, circleConfigured, circleAppId, circleContractExecution } from "./src/circle.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_DIR = "C:/Users/ASUS/arc-accounts";
const POOL = ADDRESSES.lettaPool;
const invoiceIdOf = (ref: string): `0x${string}` => keccak256(toBytes(ref));

type Acct = { pk: `0x${string}`; address: `0x${string}` };
function loadAccount(n: number): Acct {
  const env = readFileSync(`${ACCOUNTS_DIR}/account${n}/.env`, "utf8");
  const pk = env.match(/^PRIVATE_KEY=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  const address = env.match(/^ADDRESS=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  return { pk, address };
}
const operator = loadAccount(1006);
const lp = loadAccount(1002);
const buyer = loadAccount(1001);
const supplier = loadAccount(1003);

const SEED = [
  { id: "0x2efb7baef4a4e5669c116087c4a9a91e001e739f6bc3c2bbc422a44ec56a4d91" as `0x${string}`, price: 80n },
  { id: "0x72fd5f0bd6e5349d8d4fd0d5726f69495712d5ee29ab4a3200c1e2d4d44892a7" as `0x${string}`, price: 50n },
  { id: "0x2efb7baef4a4e5669c116087c4a9a91e001e739f6bc3c2bbc422a44ec56a4d91" as `0x${string}`, price: 80n },
];

const big = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);
function send(res: import("node:http").ServerResponse, code: number, obj: unknown) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj, big));
}
function body(req: import("node:http").IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
  });
}

const pub = publicClient();
const readPool = (fn: string, args: unknown[] = []) =>
  pub.readContract({ address: POOL, abi: lettaPoolAbi, functionName: fn as never, args: args as never }) as Promise<bigint>;
async function poolWrite(pk: `0x${string}`, fn: string, args: unknown[], value = 0n) {
  const hash = await walletFor(pk).writeContract({ address: POOL, abi: lettaPoolAbi, functionName: fn as never, args: args as never, value });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}
async function poolStateObj() {
  const [totalAssets, available, outstanding, totalShares, lpShares, lpRedeemable] = await Promise.all([
    readPool("totalAssets"), readPool("available"), readPool("outstanding"),
    readPool("totalShares"), readPool("shares", [lp.address]), readPool("balanceOfAssets", [lp.address]),
  ]);
  return { totalAssets, available, outstanding, totalShares, lpShares, lpRedeemable };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(readFileSync(join(__dirname, "app", "index.html")));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/accounts") {
      send(res, 200, {
        pool: POOL, poolUrl: addrUrl(POOL),
        operator: operator.address, lp: lp.address, buyer: buyer.address, supplier: supplier.address,
        underwriter: loadApiKey() ? "Claude (LLM)" : "deterministic fallback",
        circle: circleConfigured(),
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/pool") {
      send(res, 200, await poolStateObj());
      return;
    }
    // ── Circle Wallets (email/PIN login → an Arc wallet, no MetaMask) ──
    if (req.method === "GET" && url.pathname === "/api/circle/status") {
      send(res, 200, { configured: circleConfigured(), appId: circleConfigured() ? circleAppId() : null });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/circle/signup") {
      if (!circleConfigured()) { send(res, 400, { error: "Circle not configured (set CIRCLE_API_KEY + CIRCLE_APP_ID)" }); return; }
      const b = await body(req);
      const r = await circleSignup(String(b.email || "lp@letta.demo"));
      send(res, 200, r); // userToken, encryptionKey, challengeId, appId — consumed by the Web SDK
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/circle/wallet") {
      const ut = url.searchParams.get("userToken") ?? "";
      send(res, 200, { wallet: await circleWallet(ut) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/circle/deposit-challenge") {
      const b = await body(req);
      const r = await circleContractExecution({
        userToken: String(b.userToken), walletId: String(b.walletId),
        contractAddress: POOL, abiFunctionSignature: "deposit()", amount: String(b.amount ?? "0"),
      });
      send(res, 200, r);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/deposit") {
      const b = await body(req);
      const tx = await poolWrite(lp.pk, "deposit", [], BigInt(b.amountWei));
      send(res, 200, { txHash: tx, pool: await poolStateObj() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/withdraw") {
      const shares = await readPool("shares", [lp.address]);
      if (shares === 0n) { send(res, 400, { error: "LP has no shares" }); return; }
      const tx = await poolWrite(lp.pk, "withdraw", [shares]);
      send(res, 200, { txHash: tx, sharesBurned: shares.toString(), pool: await poolStateObj() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/seed") {
      for (const e of SEED) {
        const hash = await walletFor(buyer.pk).writeContract({ address: ADDRESSES.payPerCall, abi: payPerCallAbi, functionName: "pay", args: [e.id], value: e.price });
        await pub.waitForTransactionReceipt({ hash });
      }
      send(res, 200, { ok: true, count: SEED.length });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/underwrite") {
      const b = await body(req);
      const invoice: Invoice = {
        invoiceId: String(b.invoiceId), supplier: supplier.address, buyer: buyer.address,
        faceValueWei: BigInt(b.faceValueWei), dueInDays: Number(b.dueInDays) || 60, description: b.description ?? "",
      };
      const { features } = await fetchBuyerHistory(buyer.address);
      const decision = await underwrite(invoice, features);
      send(res, 200, { invoiceId: invoiceIdOf(invoice.invoiceId), features, decision, supplier: supplier.address, buyer: buyer.address });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/fund") {
      const b = await body(req);
      const tx = await poolWrite(operator.pk, "fundInvoice", [
        invoiceIdOf(String(b.invoiceId)), supplier.address, buyer.address,
        BigInt(b.faceValueWei), BigInt(b.advanceWei), BigInt(b.feeWei),
      ]);
      send(res, 200, { txHash: tx, pool: await poolStateObj() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/repay") {
      const b = await body(req);
      const tx = await poolWrite(buyer.pk, "repay", [invoiceIdOf(String(b.invoiceId))], BigInt(b.amountWei));
      const inv = (await pub.readContract({ address: POOL, abi: lettaPoolAbi, functionName: "getInvoice", args: [invoiceIdOf(String(b.invoiceId))] })) as any;
      send(res, 200, { txHash: tx, settled: inv.settled, collected: inv.collected.toString(), factorPaid: inv.factorPaid.toString(), pool: await poolStateObj() });
      return;
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: String((e as { message?: string })?.message ?? e).slice(0, 220) });
  }
});

const PORT = Number(process.env.PORT) || 8088;
server.listen(PORT, () => {
  console.log(`Letta pool app → http://localhost:${PORT}`);
  console.log(`pool=${POOL} operator=${operator.address} lp=${lp.address} buyer=${buyer.address} supplier=${supplier.address}`);
});
