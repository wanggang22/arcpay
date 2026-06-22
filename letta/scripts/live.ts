// LIVE run on Arc testnet: the full autonomous factoring loop, real USDC, end to end.
//
//   tsx scripts/live.ts
//
// Roles (funded testnet accounts; keys read at runtime, never committed):
//   factor   = account1006  (deployed FactoringPool; disburses the advance)
//   buyer    = account1001  (owes the invoice; has REAL on-chain Obol payment history,
//                            so the agent underwrites genuine, unfakeable Arc data)
//   supplier = account1003  (gets the advance now + surplus later)
//
// Flow: read buyer's on-chain history -> Claude underwrites (advance% + discount + memo)
//       -> fund USDC to supplier -> buyer pays PARTIAL -> agent re-assesses exposure live
//       -> buyer pays the rest (late) -> waterfall settles. Every tx is on arcscan.

import { readFileSync } from "node:fs";
import { publicClient, walletFor } from "../src/chain.ts";
import { ADDRESSES, txUrl, addrUrl } from "../src/config.ts";
import { payPerCallAbi } from "../src/abi.ts";
import { fetchBuyerHistory } from "../src/history.ts";
import { underwrite, loadApiKey, type Invoice } from "../src/underwrite.ts";
import { invoiceIdOf, fundInvoice, repay, getInvoice } from "../src/pool.ts";
import { reassess } from "../src/orchestrator.ts";

const ACCOUNTS_DIR = "C:/Users/ASUS/arc-accounts";

// Obol's still-active PayPerCall endpoints — the buyer pays these in-window to establish
// a real on-chain payment history the agent then underwrites (cold-start mitigation).
const SEED_ENDPOINTS = [
  { id: "0x2efb7baef4a4e5669c116087c4a9a91e001e739f6bc3c2bbc422a44ec56a4d91" as `0x${string}`, price: 80n }, // price-lookup
  { id: "0x72fd5f0bd6e5349d8d4fd0d5726f69495712d5ee29ab4a3200c1e2d4d44892a7" as `0x${string}`, price: 50n }, // classify
  { id: "0x2efb7baef4a4e5669c116087c4a9a91e001e739f6bc3c2bbc422a44ec56a4d91" as `0x${string}`, price: 80n }, // price-lookup again
];

async function seedBuyerHistory(buyerPk: `0x${string}`): Promise<number> {
  const wallet = walletFor(buyerPk);
  const pub = publicClient();
  for (const e of SEED_ENDPOINTS) {
    const hash = await wallet.writeContract({
      address: ADDRESSES.payPerCall,
      abi: payPerCallAbi,
      functionName: "pay",
      args: [e.id],
      value: e.price,
    });
    await pub.waitForTransactionReceipt({ hash });
  }
  return SEED_ENDPOINTS.length;
}

type Acct = { pk: `0x${string}`; address: `0x${string}` };
function loadAccount(n: number): Acct {
  const env = readFileSync(`${ACCOUNTS_DIR}/account${n}/.env`, "utf8");
  const pk = env.match(/^PRIVATE_KEY=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  const address = env.match(/^ADDRESS=(0x[0-9a-fA-F]+)/m)?.[1] as `0x${string}`;
  if (!pk || !address) throw new Error(`account${n}: missing PRIVATE_KEY/ADDRESS`);
  return { pk, address };
}

const usdc = (wei: bigint) => `${wei} wei`;
const line = () => console.log("─".repeat(72));

async function main() {
  const factor = loadAccount(1006);
  const buyer = loadAccount(1001);
  const supplier = loadAccount(1003);
  const pub = publicClient();

  console.log("\nLETTA — autonomous invoice factoring on Arc (live testnet run)");
  console.log(`FactoringPool: ${addrUrl(ADDRESSES.factoringPool)}`);
  console.log(`factor=${factor.address}  buyer=${buyer.address}  supplier=${supplier.address}`);
  console.log(loadApiKey() ? "Underwriter: Claude (LLM)\n" : "Underwriter: deterministic fallback (no API key)\n");

  // The invoice. On-chain amounts are tiny test-USDC wei; the narrative is a $100k invoice.
  const invoice: Invoice = {
    invoiceId: `letta-${Date.now()}`,
    supplier: supplier.address,
    buyer: buyer.address,
    faceValueWei: 1_000_000n,
    dueInDays: 60,
    description: "Export of 500 units, net-60 terms (represents a $100k invoice)",
  };

  // 0) SEED: the buyer establishes real on-chain payment activity in-window.
  line();
  console.log("0) Buyer establishes on-chain payment activity (real PayPerCall payments in-window)…");
  const seeded = await seedBuyerHistory(buyer.pk);
  console.log(`   buyer made ${seeded} real payments on Arc.`);

  // 1) READ the buyer's real on-chain payment history (the credit signal).
  line();
  console.log("1) Reading buyer's on-chain payment history from Arc (PayPerCall Paid events)…");
  const { features, events, currentBlock } = await fetchBuyerHistory(buyer.address);
  console.log(`   found ${events.length} prior payment(s); volume=${features.totalVolumeWei} wei; ` +
    `distinct counterparties=${features.distinctEndpoints}; blocks since last=${features.blocksSinceLast}`);

  // 2) UNDERWRITE: Claude prices the advance + discount with a reasoning memo.
  line();
  console.log("2) Underwriting (the agent prices the advance with money at stake)…");
  const decision = await underwrite(invoice, features, {});
  console.log(`   DECISION [${decision.source}]: advance ${decision.advancePct}% (${usdc(decision.advanceWei)}), ` +
    `discount ${decision.discountRatePct}% (fee ${usdc(decision.feeWei)})`);
  console.log(`   MEMO: ${decision.reasoning}`);

  // 3) FUND: disburse the advance in USDC to the supplier, now.
  line();
  console.log("3) Funding — disbursing the advance in USDC to the supplier on Arc…");
  const supBefore = await pub.getBalance({ address: supplier.address });
  const invoiceId = invoiceIdOf(invoice.invoiceId);
  const fundTx = await fundInvoice(factor.pk, {
    invoiceId,
    supplier: supplier.address,
    buyer: buyer.address,
    faceValueWei: invoice.faceValueWei,
    advanceWei: decision.advanceWei,
    feeWei: decision.feeWei,
  });
  const supAfterFund = await pub.getBalance({ address: supplier.address });
  console.log(`   funded. supplier balance +${supAfterFund - supBefore} wei (advance received)`);
  console.log(`   tx: ${txUrl(fundTx.txHash)}`);

  // 4) PARTIAL repayment: buyer pays part of the invoice; agent re-assesses live.
  line();
  console.log("4) Buyer makes a PARTIAL payment — agent re-assesses exposure live…");
  const partial = invoice.faceValueWei * 40n / 100n;
  const r1 = await repay(buyer.pk, invoiceId, partial);
  console.log(`   buyer paid ${usdc(partial)} → toFactor=${r1.toFactor} toSupplier=${r1.toSupplier} (partial=${r1.isPartial})`);
  console.log(`   tx: ${txUrl(r1.txHash)}`);
  const mid = await getInvoice(invoiceId);
  const reassessed = reassess(mid);
  console.log(`   RE-ASSESS: ${reassessed.memo}`);

  // 5) Buyer pays the REST (late) → waterfall settles in full.
  line();
  console.log("5) Buyer pays the remainder (late) — waterfall settles…");
  const remaining = invoice.faceValueWei - mid.collected;
  const r2 = await repay(buyer.pk, invoiceId, remaining);
  console.log(`   buyer paid ${usdc(remaining)} → toFactor=${r2.toFactor} toSupplier=${r2.toSupplier} (partial=${r2.isPartial})`);
  console.log(`   tx: ${txUrl(r2.txHash)}`);

  // 6) Final state.
  line();
  const fin = await getInvoice(invoiceId);
  const supEnd = await pub.getBalance({ address: supplier.address });
  console.log("6) Settled.");
  console.log(`   invoice settled=${fin.settled}  collected=${fin.collected}  factorPaid(recovered)=${fin.factorPaid}  supplierPaid(surplus)=${fin.supplierPaid}`);
  console.log(`   factor recovered advance+fee = ${decision.advanceWei + decision.feeWei} wei (profit = fee ${decision.feeWei} wei)`);
  console.log(`   supplier net over the deal = advance ${decision.advanceWei} + surplus ${fin.supplierPaid} = ${decision.advanceWei + fin.supplierPaid} wei (face - fee)`);
  console.log(`   supplier on-chain balance moved +${supEnd - supBefore} wei across fund + settle`);
  line();
  console.log("\nVERIFY ON ARCSCAN:");
  console.log(`  fund:    ${txUrl(fundTx.txHash)}`);
  console.log(`  partial: ${txUrl(r1.txHash)}`);
  console.log(`  settle:  ${txUrl(r2.txHash)}`);
  console.log(`  pool:    ${addrUrl(ADDRESSES.factoringPool)}\n`);

  // machine-readable tail for downstream (PDF / submission evidence)
  console.log("EVIDENCE_JSON=" + JSON.stringify({
    pool: ADDRESSES.factoringPool,
    factor: factor.address, buyer: buyer.address, supplier: supplier.address,
    underwriter: decision.source, advancePct: decision.advancePct, discountRatePct: decision.discountRatePct,
    faceValueWei: invoice.faceValueWei.toString(), advanceWei: decision.advanceWei.toString(), feeWei: decision.feeWei.toString(),
    reasoning: decision.reasoning,
    historyPayments: events.length, currentBlock: currentBlock.toString(),
    fundTx: fundTx.txHash, partialTx: r1.txHash, settleTx: r2.txHash,
    settled: fin.settled, collected: fin.collected.toString(), factorRecovered: fin.factorPaid.toString(), supplierSurplus: fin.supplierPaid.toString(),
  }));
}

main().catch((e) => {
  console.error("LIVE RUN FAILED:", e);
  process.exit(1);
});
