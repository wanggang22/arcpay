// Letta app backend: a thin HTTP API that wraps the agent + chain modules and serves the
// interactive frontend. The factor's "console" — it holds the factor/buyer/supplier testnet
// keys (read at runtime from arc-accounts, never committed) and drives the real on-chain flow.
//
//   npm run app   ->   http://localhost:8088
//
// Endpoints (all return JSON; bigints serialized as strings):
//   POST /api/seed       buyer makes real PayPerCall payments (establish on-chain history)
//   POST /api/underwrite {invoiceId, faceValueWei, dueInDays, description} -> {features, decision}
//   POST /api/fund       {invoiceId, faceValueWei, advanceWei, feeWei} -> {txHash}
//   POST /api/repay      {invoiceId, amountWei} -> {txHash, toFactor, toSupplier, isPartial}
//   GET  /api/invoice?id={ref} -> {invoice, progress, memo}

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchBuyerHistory } from "./src/history.ts";
import { underwrite, loadApiKey, type Invoice } from "./src/underwrite.ts";
import { invoiceIdOf, fundInvoice, repay, getInvoice } from "./src/pool.ts";
import { reassess } from "./src/orchestrator.ts";
import { walletFor, publicClient } from "./src/chain.ts";
import { ADDRESSES, addrUrl } from "./src/config.ts";
import { payPerCallAbi } from "./src/abi.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_DIR = "C:/Users/ASUS/arc-accounts";

type Acct = { pk: `0x${string}`; address: `0x${string}` };
function loadAccount(n: number): Acct {
  const env = readFileSync(`${ACCOUNTS_DIR}/account${n}/.env`, "utf8");
  const pk = env.match(/^PRIVATE_KEY=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  const address = env.match(/^ADDRESS=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  return { pk, address };
}
const factor = loadAccount(1006);
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
    req.on("end", () => {
      try {
        resolve(s ? JSON.parse(s) : {});
      } catch {
        resolve({});
      }
    });
  });
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
        factor: factor.address,
        buyer: buyer.address,
        supplier: supplier.address,
        pool: ADDRESSES.factoringPool,
        poolUrl: addrUrl(ADDRESSES.factoringPool),
        underwriter: loadApiKey() ? "Claude (LLM)" : "deterministic fallback",
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/seed") {
      const wallet = walletFor(buyer.pk);
      const pub = publicClient();
      for (const e of SEED) {
        const hash = await wallet.writeContract({ address: ADDRESSES.payPerCall, abi: payPerCallAbi, functionName: "pay", args: [e.id], value: e.price });
        await pub.waitForTransactionReceipt({ hash });
      }
      send(res, 200, { ok: true, count: SEED.length });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/underwrite") {
      const b = await body(req);
      const invoice: Invoice = {
        invoiceId: String(b.invoiceId),
        supplier: supplier.address,
        buyer: buyer.address,
        faceValueWei: BigInt(b.faceValueWei),
        dueInDays: Number(b.dueInDays) || 60,
        description: b.description ?? "",
      };
      const { features } = await fetchBuyerHistory(buyer.address);
      const decision = await underwrite(invoice, features);
      send(res, 200, { invoiceId: invoiceIdOf(invoice.invoiceId), features, decision, supplier: supplier.address, buyer: buyer.address });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/fund") {
      const b = await body(req);
      const r = await fundInvoice(factor.pk, {
        invoiceId: invoiceIdOf(String(b.invoiceId)),
        supplier: supplier.address,
        buyer: buyer.address,
        faceValueWei: BigInt(b.faceValueWei),
        advanceWei: BigInt(b.advanceWei),
        feeWei: BigInt(b.feeWei),
      });
      send(res, 200, r);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/repay") {
      const b = await body(req);
      const r = await repay(buyer.pk, invoiceIdOf(String(b.invoiceId)), BigInt(b.amountWei));
      const inv = await getInvoice(invoiceIdOf(String(b.invoiceId)));
      send(res, 200, { ...r, ...reassess(inv) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/invoice") {
      const ref = url.searchParams.get("id") ?? "";
      const inv = await getInvoice(invoiceIdOf(ref));
      send(res, 200, { invoice: inv, ...reassess(inv) });
      return;
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: String((e as { message?: string })?.message ?? e).slice(0, 200) });
  }
});

const PORT = Number(process.env.PORT) || 8088;
server.listen(PORT, () => {
  console.log(`Letta app → http://localhost:${PORT}`);
  console.log(`factor=${factor.address}  buyer=${buyer.address}  supplier=${supplier.address}`);
});
