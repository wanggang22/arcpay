// Wires the three micro-services into named sellers, and provides executors for
// the buyer loop:
//   - directExecute: call the service handler directly (offline demo of brain+services)
//   - onchainExecute: pay the endpoint then call the seller's gated /serve (live settlement)

import type { Service } from "./catalog.ts";
import type { ExecuteCall } from "./agent.ts";
import { summarize, classify, priceLookup } from "./services.ts";
import { payAndCall } from "./buyer.ts";
import type { NetworkName } from "./chain.ts";

export type SellerSpec = {
  name: string;
  capability: string;
  priceWei: bigint;
  handle: (input: unknown) => Promise<unknown>;
};

// The buyer's generic input is often just { goal }. Each seller adapts that generic
// input to its own service shape with safe defaults, so services.ts stays strict/pure.
const asObj = (i: unknown): Record<string, unknown> =>
  i && typeof i === "object" ? (i as Record<string, unknown>) : {};
const pickText = (i: unknown): string => {
  const o = asObj(i);
  return String(o.text ?? o.goal ?? "");
};
const KNOWN_SYMBOLS = ["BTC", "ETH", "USDC", "USDT", "ARC", "SOL"];
const pickSymbol = (i: unknown): string => {
  const o = asObj(i);
  if (o.symbol) return String(o.symbol);
  const text = String(o.goal ?? o.text ?? "").toUpperCase();
  return KNOWN_SYMBOLS.find((s) => new RegExp(`\\b${s}\\b`).test(text)) ?? "BTC";
};
const asSummarize = (i: unknown) => {
  const o = asObj(i);
  return {
    url: o.url as string | undefined,
    text: (o.text ?? o.goal) as string | undefined,
    maxSentences: o.maxSentences as number | undefined,
  };
};

export const SELLER_SPECS: SellerSpec[] = [
  {
    name: "summarize",
    capability: "fetch a url and summarize it into a couple of sentences",
    priceWei: 200n,
    handle: (i) => summarize(asSummarize(i)),
  },
  {
    name: "classify",
    capability: "sentiment classification of a text snippet (positive/negative/neutral)",
    priceWei: 50n,
    handle: async (i) => classify({ text: pickText(i) }),
  },
  {
    name: "price-lookup",
    capability: "current usd price for a crypto token symbol",
    priceWei: 80n,
    handle: (i) => priceLookup({ symbol: pickSymbol(i) }),
  },
];

export const HANDLERS: Record<string, (input: unknown) => Promise<unknown>> = Object.fromEntries(
  SELLER_SPECS.map((s) => [s.name, s.handle]),
);

/** Offline executor: invoke the matching service handler directly, charge the listed price. */
export function directExecute(): ExecuteCall {
  return async (service: Service, input: unknown) => {
    const handle = HANDLERS[service.name];
    if (!handle) throw new Error(`no handler for service ${service.name}`);
    return { result: await handle(input), costWei: service.priceWei };
  };
}

/** Live executor: real on-chain pay + receipt-gated HTTP call. */
export function onchainExecute(opts: {
  buyerPk: `0x${string}`;
  buyerAddress: `0x${string}`;
  network?: NetworkName;
}): ExecuteCall {
  return async (service: Service, input: unknown) => {
    const { result } = await payAndCall({
      buyerPk: opts.buyerPk,
      buyerAddress: opts.buyerAddress,
      endpointId: service.endpointId,
      sellerUrl: service.sellerUrl,
      input,
      network: opts.network ?? "testnet",
    });
    return { result, costWei: service.priceWei };
  };
}
