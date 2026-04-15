'use client';
import Link from 'next/link';
import { usePrivy, useWallets } from '@privy-io/react-auth';

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
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}

function AuthButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  if (!ready) {
    return <button className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-semibold opacity-50">Loading...</button>;
  }

  if (!authenticated) {
    return (
      <button onClick={login}
        className="px-4 py-2 rounded-xl bg-arc-gradient text-white text-sm font-semibold hover:opacity-90">
        Sign in
      </button>
    );
  }

  const label = user?.email?.address
    ?? user?.google?.email
    ?? (wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Connected');

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted truncate max-w-[140px]" title={label}>{label}</span>
      <button onClick={logout}
        className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-bg">
        Sign out
      </button>
    </div>
  );
}
