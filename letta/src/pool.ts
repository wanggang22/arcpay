// Thin viem client for the deployed FactoringPool. Writes (fund/repay/withdraw) wait for
// the receipt so callers get a confirmed tx hash for arcscan. Reads return the invoice state.

import { keccak256, toBytes, decodeEventLog } from "viem";
import { publicClient, walletFor } from "./chain.ts";
import { ADDRESSES } from "./config.ts";
import { factoringPoolAbi } from "./abi.ts";

export const invoiceIdOf = (ref: string): `0x${string}` => keccak256(toBytes(ref));

export type OnchainInvoice = {
  supplier: `0x${string}`;
  buyer: `0x${string}`;
  faceValue: bigint;
  advance: bigint;
  fee: bigint;
  collected: bigint;
  factorPaid: bigint;
  supplierPaid: bigint;
  funded: boolean;
  settled: boolean;
};

export async function getInvoice(invoiceId: `0x${string}`): Promise<OnchainInvoice> {
  const r = await publicClient().readContract({
    address: ADDRESSES.factoringPool,
    abi: factoringPoolAbi,
    functionName: "getInvoice",
    args: [invoiceId],
  });
  return r as unknown as OnchainInvoice;
}

export async function fundInvoice(
  factorPk: `0x${string}`,
  p: { invoiceId: `0x${string}`; supplier: `0x${string}`; buyer: `0x${string}`; faceValueWei: bigint; advanceWei: bigint; feeWei: bigint },
): Promise<{ txHash: `0x${string}` }> {
  const wallet = walletFor(factorPk);
  const hash = await wallet.writeContract({
    address: ADDRESSES.factoringPool,
    abi: factoringPoolAbi,
    functionName: "fundInvoice",
    args: [p.invoiceId, p.supplier, p.buyer, p.faceValueWei, p.advanceWei, p.feeWei],
    value: p.advanceWei,
  });
  await publicClient().waitForTransactionReceipt({ hash });
  return { txHash: hash };
}

export async function repay(
  payerPk: `0x${string}`,
  invoiceId: `0x${string}`,
  amountWei: bigint,
): Promise<{ txHash: `0x${string}`; toFactor: bigint; toSupplier: bigint; isPartial: boolean }> {
  const wallet = walletFor(payerPk);
  const hash = await wallet.writeContract({
    address: ADDRESSES.factoringPool,
    abi: factoringPoolAbi,
    functionName: "repay",
    args: [invoiceId],
    value: amountWei,
  });
  const receipt = await publicClient().waitForTransactionReceipt({ hash });
  let toFactor = 0n;
  let toSupplier = 0n;
  let isPartial = true;
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: factoringPoolAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "Repaid") {
        const a = ev.args as unknown as { toFactor: bigint; toSupplier: bigint; isPartial: boolean };
        toFactor = a.toFactor;
        toSupplier = a.toSupplier;
        isPartial = a.isPartial;
      }
    } catch {
      /* not our event */
    }
  }
  return { txHash: hash, toFactor, toSupplier, isPartial };
}
