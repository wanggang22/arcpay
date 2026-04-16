'use client';
import { NETWORK } from '@/lib/config';

const EXPLORERS = {
  testnet: 'https://testnet.arcscan.app',
  local: '',
};

export function TxLink({ tx, label }: { tx: string; label?: string }) {
  const base = EXPLORERS[NETWORK];
  const short = `${tx.slice(0, 10)}...${tx.slice(-6)}`;
  if (!base) {
    return <span className="font-mono text-xs">{short}</span>;
  }
  return (
    <a href={`${base}/tx/${tx}`} target="_blank" rel="noopener noreferrer"
      className="font-mono text-xs underline decoration-dotted hover:text-accent"
      title="View on Arcscan (opens in new tab)">
      {label ?? short} ↗
    </a>
  );
}

export function AddressLink({ address, label }: { address: string; label?: string }) {
  const base = EXPLORERS[NETWORK];
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  if (!base) {
    return <span className="font-mono text-xs">{short}</span>;
  }
  return (
    <a href={`${base}/address/${address}`} target="_blank" rel="noopener noreferrer"
      className="font-mono text-xs underline decoration-dotted hover:text-accent"
      title="View on Arcscan">
      {label ?? short} ↗
    </a>
  );
}
