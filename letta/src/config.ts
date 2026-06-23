// Arc testnet config + deployed addresses for Letta.
// FactoringPool was deployed in-window by account1001 (the factor); PayPerCall is
// ArcPay's existing endpoint contract, reused here purely as a *credit signal source*
// — its on-chain Paid events are the buyer's verifiable payment history.

export const ARC_TESTNET = {
  chainId: 5042002,
  name: "Arc Testnet",
  rpc: "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
} as const;

export const ADDRESSES = {
  factoringPool: "0xcE939A8048b8BF5bE9DfE639d4C65227A99901F5" as `0x${string}`, // v1: single-factor
  lettaPool: "0x66a8fd4cd737dC91ca285c6eC7Ef798cFa9Af617" as `0x${string}`, // v2: LP-funded liquidity pool
  payPerCall: "0x3a399A310965A5cbD5a2B9F21a3B9885B6372def" as `0x${string}`,
} as const;

export const txUrl = (hash: string) => `${ARC_TESTNET.explorer}/tx/${hash}`;
export const addrUrl = (addr: string) => `${ARC_TESTNET.explorer}/address/${addr}`;
