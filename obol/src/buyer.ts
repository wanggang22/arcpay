// The buyer side of one paid call: pay the endpoint on-chain, then call the seller
// with the resulting callId so the seller can verify the receipt before serving.
// (Phase 2 adds the LLM decision loop on top of this primitive.)

import { payEndpoint } from "./payments.ts";
import type { NetworkName } from "./chain.ts";

export async function payAndCall(opts: {
  buyerPk: `0x${string}`;
  buyerAddress: `0x${string}`;
  endpointId: `0x${string}`;
  sellerUrl: string;
  input: unknown;
  network?: NetworkName; // default "testnet"
}): Promise<{ callId: bigint; txHash: `0x${string}`; result: unknown }> {
  const network = opts.network ?? "testnet";
  const { callId, txHash } = await payEndpoint(opts.buyerPk, opts.endpointId, network);

  const res = await fetch(
    `${opts.sellerUrl}/serve?callId=${callId}&payer=${opts.buyerAddress}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts.input),
    },
  );
  if (!res.ok) {
    throw new Error(`seller refused (${res.status}): ${await res.text()}`);
  }
  const { result } = (await res.json()) as { result: unknown };
  return { callId, txHash, result };
}
