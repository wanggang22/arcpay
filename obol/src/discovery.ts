// Service discovery: read each seller's /.well-known/obol.json descriptor and
// build the buyer's Catalog. (On-chain price cross-check via getEndpoint can be
// layered on later; the descriptor is the discovery surface.)

import type { Catalog, Service } from "./catalog.ts";

export type Descriptor = {
  name: string;
  capability: string;
  endpointId: `0x${string}`;
  priceWei: string;
  network?: string;
};

/** Fetch one seller's descriptor; returns null if unreachable/malformed. */
export async function fetchDescriptor(
  sellerUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Service | null> {
  try {
    const res = await fetchImpl(`${sellerUrl}/.well-known/obol.json`);
    if (!res.ok) return null;
    const d = (await res.json()) as Descriptor;
    if (!d.name || !d.endpointId || d.priceWei === undefined) return null;
    return {
      name: d.name,
      capability: d.capability ?? "",
      endpointId: d.endpointId,
      priceWei: BigInt(d.priceWei),
      sellerUrl,
    };
  } catch {
    return null;
  }
}

/** Build a Catalog from a list of seller URLs; silently drops unreachable ones. */
export async function discover(
  sellerUrls: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Catalog> {
  const found = await Promise.all(sellerUrls.map((u) => fetchDescriptor(u, fetchImpl)));
  return found.filter((s): s is Service => s !== null);
}
