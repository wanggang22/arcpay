// The set of seller services a buyer agent can choose from.
// In Phase 3 this is populated from sellers' /.well-known/obol.json descriptors
// (cross-checked on-chain); here it's just the shared type + a budget filter.

export type Service = {
  name: string;
  capability: string;
  endpointId: `0x${string}`;
  priceWei: bigint;
  sellerUrl: string;
};

export type Catalog = Service[];

/** Services the buyer can still afford with `remainingWei` of budget left. */
export function affordable(catalog: Catalog, remainingWei: bigint): Catalog {
  return catalog.filter((s) => s.priceWei <= remainingWei);
}
