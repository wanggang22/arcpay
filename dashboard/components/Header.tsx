'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

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
          <ConnectButton accountStatus="address" chainStatus="icon" />
        </nav>
      </div>
    </header>
  );
}
