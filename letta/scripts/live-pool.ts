// LIVE run of the LP-funded pool model (LettaPool) on Arc testnet — proves the operator does
// NOT front capital: a liquidity provider funds the pool, the agent underwrites + funds the
// advance from the pool, the buyer repays, the fee accrues as the LP's yield, and the LP
// withdraws more than it deposited.
//
//   tsx scripts/live-pool.ts
//
//   operator = account1006 (runs the agent; funds from the pool, provides no capital)
//   LP       = account1002 (deposits USDC into the pool, earns the fee as yield)
//   buyer    = account1001 (owes the invoice; has real on-chain history)
//   supplier = account1003 (receives the advance + surplus)

import { readFileSync } from "node:fs";
import { decodeEventLog } from "viem";
import { publicClient, walletFor } from "../src/chain.ts";
import { ADDRESSES, txUrl, addrUrl } from "../src/config.ts";
import { lettaPoolAbi, payPerCallAbi } from "../src/abi.ts";
import { fetchBuyerHistory } from "../src/history.ts";
import { underwrite, loadApiKey, type Invoice } from "../src/underwrite.ts";
import { invoiceIdOf } from "../src/pool.ts";

const ACCOUNTS_DIR = "C:/Users/ASUS/arc-accounts";
type Acct = { pk: `0x${string}`; address: `0x${string}` };
function loadAccount(n: number): Acct {
  const env = readFileSync(`${ACCOUNTS_DIR}/account${n}/.env`, "utf8");
  const pk = env.match(/^PRIVATE_KEY=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  const address = env.match(/^ADDRESS=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  return { pk, address };
}

const SEED = [
  { id: "0x2efb7baef4a4e5669c116087c4a9a91e001e739f6bc3c2bbc422a44ec56a4d91" as `0x${string}`, price: 80n },
  { id: "0x72fd5f0bd6e5349d8d4fd0d5726f69495712d5ee29ab4a3200c1e2d4d44892a7" as `0x${string}`, price: 50n },
  { id: "0x2efb7baef4a4e5669c116087c4a9a91e001e739f6bc3c2bbc422a44ec56a4d91" as `0x${string}`, price: 80n },
];

const POOL = ADDRESSES.lettaPool;
const line = () => console.log("─".repeat(72));

async function poolState(label: string) {
  const pub = publicClient();
  const read = (fn: string, args: unknown[] = []) =>
    pub.readContract({ address: POOL, abi: lettaPoolAbi, functionName: fn as never, args: args as never }) as Promise<bigint>;
  const [assets, avail, out] = await Promise.all([read("totalAssets"), read("available"), read("outstanding")]);
  console.log(`   pool[${label}]: totalAssets=${assets} available=${avail} outstanding=${out} wei`);
}

async function main() {
  const operator = loadAccount(1006);
  const lp = loadAccount(1002);
  const buyer = loadAccount(1001);
  const supplier = loadAccount(1003);
  const pub = publicClient();

  console.log("\nLETTA POOL — LP-funded invoice factoring on Arc (live testnet run)");
  console.log(`LettaPool: ${addrUrl(POOL)}`);
  console.log(`operator=${operator.address}  LP=${lp.address}  buyer=${buyer.address}  supplier=${supplier.address}`);
  console.log(loadApiKey() ? "Underwriter: Claude (LLM)\n" : "Underwriter: deterministic fallback\n");

  const send = async (pk: `0x${string}`, fn: string, args: unknown[], value = 0n) => {
    const hash = await walletFor(pk).writeContract({ address: POOL, abi: lettaPoolAbi, functionName: fn as never, args: args as never, value });
    await pub.waitForTransactionReceipt({ hash });
    return hash;
  };

  // 0) buyer establishes on-chain history
  line();
  console.log("0) Buyer establishes on-chain payment activity…");
  for (const e of SEED) {
    const h = await walletFor(buyer.pk).writeContract({ address: ADDRESSES.payPerCall, abi: payPerCallAbi, functionName: "pay", args: [e.id], value: e.price });
    await pub.waitForTransactionReceipt({ hash: h });
  }
  console.log(`   ${SEED.length} payments made.`);

  // 1) LP funds the pool (NOT the operator)
  line();
  const DEPOSIT = 3_000_000n;
  console.log(`1) LP deposits ${DEPOSIT} wei into the pool (this is the capital — not the operator's)…`);
  const depTx = await send(lp.pk, "deposit", [], DEPOSIT);
  console.log(`   deposited. tx: ${txUrl(depTx)}`);
  await poolState("after deposit");
  const lpStart = (await pub.readContract({ address: POOL, abi: lettaPoolAbi, functionName: "balanceOfAssets", args: [lp.address] })) as bigint;
  console.log(`   LP redeemable now: ${lpStart} wei`);

  // 2) underwrite
  line();
  console.log("2) Underwriting (Claude prices the advance from the buyer's on-chain history)…");
  const invoice: Invoice = { invoiceId: `letta-pool-${Date.now()}`, supplier: supplier.address, buyer: buyer.address, faceValueWei: 1_000_000n, dueInDays: 60, description: "pooled factoring demo" };
  const { features } = await fetchBuyerHistory(buyer.address);
  const decision = await underwrite(invoice, features, {});
  console.log(`   DECISION [${decision.source}]: advance ${decision.advancePct}% (${decision.advanceWei} wei), discount ${decision.discountRatePct}% (fee ${decision.feeWei} wei)`);

  // 3) operator funds the advance FROM THE POOL
  line();
  console.log("3) Operator funds the advance FROM THE POOL (operator provides no capital)…");
  const id = invoiceIdOf(invoice.invoiceId);
  const supBefore = await pub.getBalance({ address: supplier.address });
  const fundTx = await send(operator.pk, "fundInvoice", [id, supplier.address, buyer.address, invoice.faceValueWei, decision.advanceWei, decision.feeWei]);
  const supAfterFund = await pub.getBalance({ address: supplier.address });
  console.log(`   supplier +${supAfterFund - supBefore} wei (advance, drawn from pool liquidity). tx: ${txUrl(fundTx)}`);
  await poolState("after fund");

  // 4) buyer repays — pool recovers principal + fee; fee is LP yield
  line();
  console.log("4) Buyer repays in full — pool recovers principal + fee (the fee is LP yield)…");
  const repayTx = await send(buyer.pk, "repay", [id], invoice.faceValueWei);
  console.log(`   repaid. tx: ${txUrl(repayTx)}`);
  await poolState("after repay");

  // 5) the LP has earned yield
  line();
  const lpEnd = (await pub.readContract({ address: POOL, abi: lettaPoolAbi, functionName: "balanceOfAssets", args: [lp.address] })) as bigint;
  console.log(`5) LP yield: redeemable ${lpStart} → ${lpEnd} wei (earned ${lpEnd - lpStart} wei = the fee).`);

  // 6) LP withdraws deposit + yield
  line();
  console.log("6) LP withdraws — gets back more than it deposited…");
  const lpShares = (await pub.readContract({ address: POOL, abi: lettaPoolAbi, functionName: "shares", args: [lp.address] })) as bigint;
  const lpBalBefore = await pub.getBalance({ address: lp.address });
  const wTx = await send(lp.pk, "withdraw", [lpShares]);
  const lpBalAfter = await pub.getBalance({ address: lp.address });
  console.log(`   withdrew. LP on-chain balance net +${lpBalAfter - lpBalBefore} wei (minus gas). tx: ${txUrl(wTx)}`);

  line();
  console.log("\nVERIFY ON ARCSCAN:");
  console.log(`  deposit: ${txUrl(depTx)}`);
  console.log(`  fund:    ${txUrl(fundTx)}`);
  console.log(`  repay:   ${txUrl(repayTx)}`);
  console.log(`  withdraw:${txUrl(wTx)}`);
  console.log(`  pool:    ${addrUrl(POOL)}\n`);
  console.log("EVIDENCE_JSON=" + JSON.stringify({
    model: "LP-funded liquidity pool", pool: POOL,
    operator: operator.address, lp: lp.address, buyer: buyer.address, supplier: supplier.address,
    deposit: DEPOSIT.toString(), advancePct: decision.advancePct, feeWei: decision.feeWei.toString(),
    lpRedeemableStart: lpStart.toString(), lpRedeemableEnd: lpEnd.toString(), lpYield: (lpEnd - lpStart).toString(),
    depositTx: depTx, fundTx, repayTx, withdrawTx: wTx,
  }));
}

main().catch((e) => { console.error("POOL LIVE RUN FAILED:", e); process.exit(1); });
