'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const HAS_PRIVY = PRIVY_APP_ID.length >= 20 && !PRIVY_APP_ID.includes('demo') && !PRIVY_APP_ID.includes('replace');

export function Header() {
  return (
    <header className="border-b border-border bg-panel">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-arc-gradient" />
          <span className="font-bold text-lg">ArcPay</span>
          <span className="text-xs text-muted ml-2">Dashboard</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/" className="text-sm text-muted hover:text-ink">Home</Link>
          <Link href="/tips" className="text-sm text-muted hover:text-ink">Tips</Link>
          <Link href="/subscriptions" className="text-sm text-muted hover:text-ink">Subs</Link>
          <Link href="/content" className="text-sm text-muted hover:text-ink">Content</Link>
          <Link href="/api" className="text-sm text-muted hover:text-ink">API</Link>
          {HAS_PRIVY ? <PrivyAuthButton /> : <WagmiAuthButton />}
        </nav>
      </div>
    </header>
  );
}

function WalletBadge({ address }: { address: string }) {
  const { data: bal } = useBalance({ address: address as `0x${string}` });
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={copy}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg border border-border hover:border-accent transition"
      title="Click to copy full address">
      <span className="text-xs font-mono text-muted">{copied ? '✓ Copied!' : short}</span>
      {bal && (
        <span className="text-xs font-semibold text-accent">
          {Number(formatUnits(bal.value, 18)).toFixed(3)} USDC
        </span>
      )}
    </button>
  );
}

function PrivyAuthButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  if (!ready) return <button className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-semibold opacity-50">Loading...</button>;
  if (!authenticated) return (
    <button onClick={() => login()} className="px-4 py-2 rounded-xl bg-arc-gradient text-white text-sm font-semibold hover:opacity-90">
      Sign in
    </button>
  );

  const email = user?.email?.address ?? user?.google?.email;

  return (
    <div className="flex items-center gap-2">
      {wallet && <WalletBadge address={wallet.address} />}
      {email && <span className="text-xs text-muted hidden md:inline max-w-[140px] truncate" title={email}>{email}</span>}
      <button onClick={() => logout()} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-bg">
        Sign out
      </button>
    </div>
  );
}

function WagmiAuthButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (!isConnected) return (
    <button onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      className="px-4 py-2 rounded-xl bg-arc-gradient text-white text-sm font-semibold hover:opacity-90">
      Connect wallet
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      {address && <WalletBadge address={address} />}
      <button onClick={() => disconnect()} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-bg">
        Disconnect
      </button>
    </div>
  );
}
