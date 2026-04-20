'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits } from 'viem';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const HAS_PRIVY = PRIVY_APP_ID.length >= 20 && !PRIVY_APP_ID.includes('demo') && !PRIVY_APP_ID.includes('replace');
const CIRCLE_FAUCET_URL = 'https://faucet.circle.com/';

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { data: bal, refetch } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { refetchInterval: 5_000, enabled: Boolean(address) },
  });

  const privy = HAS_PRIVY ? usePrivy() : null;
  const wallets = HAS_PRIVY ? useWallets().wallets : [];
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [copied, setCopied] = useState(false);
  const [justSaw, setJustSaw] = useState<bigint | null>(null);

  // Remember the balance at page load so we can detect the jump after faucet
  useEffect(() => {
    if (bal && justSaw === null) setJustSaw(bal.value);
  }, [bal, justSaw]);

  const received = bal && justSaw !== null && bal.value > justSaw ? bal.value - justSaw : 0n;
  const hasBalance = bal && bal.value > 0n;

  const copyAndOpen = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    window.open(CIRCLE_FAUCET_URL, '_blank', 'noopener,noreferrer');
  };

  const signIn = () => {
    if (HAS_PRIVY && privy) privy.login();
    else if (connectors[0]) connect({ connector: connectors[0] });
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent" />
          <span className="font-bold">ArcPay</span>
        </Link>
        <Link href="/gavin" className="text-sm text-gray-600 hover:text-gray-900">Try the app →</Link>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-8 pb-20">
        <h1 className="text-3xl font-bold mb-2">💧 Get free testnet USDC</h1>
        <p className="text-gray-600 text-sm mb-6">
          ArcPay runs on Arc testnet — everything is free. Grab <strong>$10 USDC</strong> from Circle&apos;s official faucet to tip creators, subscribe, unlock content, or fund an AI agent&apos;s pay-per-call budget.
        </p>

        {/* Step 1 — Sign in */}
        <Step num="1" title="Sign in to ArcPay" done={isConnected}>
          {!isConnected ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">Email / X / Google / Discord / external wallet — any works.</p>
              <button onClick={signIn}
                className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold">
                Sign in
              </button>
            </div>
          ) : (
            <WalletSummary address={address!} balance={bal?.value ?? 0n} />
          )}
        </Step>

        {/* Step 2 — Copy address & open faucet */}
        <Step num="2" title="Get USDC from Circle Faucet" done={Boolean(hasBalance && received > 0n)}>
          {!isConnected ? (
            <p className="text-sm text-gray-500">Sign in first to see your wallet address.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate">
                  {address}
                </code>
                <button onClick={copyAndOpen}
                  className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-gray-900 text-white hover:bg-gray-700">
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <button onClick={copyAndOpen}
                className="w-full py-3 rounded-xl font-bold text-white bg-accent">
                📋 Copy address &amp; open Circle Faucet ↗
              </button>
              <ol className="mt-4 text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Button above copies your address and opens faucet.circle.com in a new tab</li>
                <li>On Circle&apos;s page select <strong>Arc Sepolia</strong> (or latest Arc testnet option)</li>
                <li>Paste the address (already in your clipboard) → Request 10 USDC</li>
                <li>Come back here — balance updates automatically every 5s</li>
              </ol>
            </>
          )}
        </Step>

        {/* Step 3 — Ready */}
        <Step num="3" title="Try ArcPay" done={Boolean(hasBalance)}>
          {!isConnected ? (
            <p className="text-sm text-gray-500">Complete steps 1 &amp; 2 first.</p>
          ) : !hasBalance ? (
            <p className="text-sm text-gray-500">Waiting for Circle to send USDC… (usually 5–15 seconds)</p>
          ) : (
            <div>
              <div className="mb-3 p-3 rounded-xl bg-green-50 border border-green-200">
                <div className="text-xs text-green-700">Your balance</div>
                <div className="text-2xl font-bold text-green-700">{Number(formatUnits(bal!.value, 18)).toFixed(4)} USDC</div>
                {received > 0n && (
                  <div className="text-xs text-green-600 mt-1">+{Number(formatUnits(received, 18)).toFixed(4)} received just now 🎉</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/gavin"
                  className="text-center py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90">
                  💸 Tip @gavin
                </Link>
                <Link href="https://app.arcpay.finance"
                  className="text-center py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold hover:border-gray-400">
                  Creator Dashboard
                </Link>
              </div>
            </div>
          )}
        </Step>

        {/* Disconnect (dev hint) */}
        {isConnected && (
          <div className="mt-6 text-center">
            <button
              onClick={() => (HAS_PRIVY && privy ? privy.logout() : disconnect())}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Sign out
            </button>
          </div>
        )}

        <div className="mt-10 p-4 bg-gray-50 rounded-2xl text-xs text-gray-600 leading-relaxed">
          <strong>Why Circle?</strong> Circle is the issuer of USDC and runs the official Arc faucet. ArcPay uses native USDC as gas — one token for everything: gas fees, tips, subscriptions, API payments. No bridging, no separate gas token.
        </div>
      </main>
    </div>
  );
}

function Step({ num, title, done, children }: { num: string; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className={`mb-4 p-5 rounded-2xl border-2 ${done ? 'border-green-300 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
          ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {done ? '✓' : num}
        </div>
        <div className="font-bold">{title}</div>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  );
}

function WalletSummary({ address, balance }: { address: string; balance: bigint }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">Connected wallet</div>
        <div className="text-sm font-mono font-bold">{short}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-500">Current balance</div>
        <div className="text-sm font-bold">{Number(formatUnits(balance, 18)).toFixed(4)} USDC</div>
      </div>
    </div>
  );
}
