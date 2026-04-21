'use client';
import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Header } from '@/components/Header';
import { RegisterModal } from '@/components/RegisterModal';
import { StatsCard } from '@/components/StatsCard';
import { ADDRESSES, registryAbi, tipJarAbi, subscriptionsAbi, payPerCallAbi, contentPaywallAbi, NETWORK } from '@/lib/config';
import { formatUnits, keccak256, stringToHex } from 'viem';
import Link from 'next/link';

export default function Page() {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if connected address owns any username
  const { data: usernameHashes } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi,
    functionName: 'getUsernamesByAddress',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: firstName } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi,
    functionName: 'getNameByHash',
    args: usernameHashes && usernameHashes.length > 0 ? [usernameHashes[0]] : undefined,
    query: { enabled: !!usernameHashes && usernameHashes.length > 0 },
  });

  useEffect(() => {
    if (usernameHashes !== undefined) {
      setUsername(firstName || null);
      setLoading(false);
    }
  }, [usernameHashes, firstName]);

  // Read earnings
  const { data: tipTotal } = useReadContract({
    address: ADDRESSES.tipJar, abi: tipJarAbi,
    functionName: 'getLifetimeReceived',
    args: username ? [username] : undefined,
    query: { enabled: !!username, refetchInterval: 5000 },
  });

  const { data: subClaimable } = useReadContract({
    address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
    functionName: 'claimableRevenue',
    args: username ? [username] : undefined,
    query: { enabled: !!username, refetchInterval: 5000 },
  });

  const { data: apiClaimable } = useReadContract({
    address: ADDRESSES.payPerCall, abi: payPerCallAbi,
    functionName: 'claimableRevenue',
    args: username ? [username] : undefined,
    query: { enabled: !!username, refetchInterval: 5000 },
  });

  const { data: contentClaimable } = useReadContract({
    address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
    functionName: 'claimableRevenue',
    args: username ? [username] : undefined,
    query: { enabled: !!username, refetchInterval: 5000 },
  });

  const fmt = (v?: bigint) => v ? Number(formatUnits(v, 18)).toFixed(4) : '0.0000';

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold">Welcome to ArcPay</h1>
            <p className="text-muted mt-2">Connect your wallet to manage your creator account</p>
          </div>
        ) : loading ? (
          <div className="text-center py-20 text-muted">Loading...</div>
        ) : !username ? (
          <div className="py-20">
            <RegisterModal onRegistered={setUsername} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-sm text-muted">Your ArcPay handle</div>
                <div className="flex items-center gap-3 mt-1">
                  <h1 className="text-3xl font-bold font-mono">@{username}</h1>
                  <button
                    onClick={() => navigator.clipboard.writeText(`https://arcpay.finance/${username}`)}
                    className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20">
                    Copy link
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted">
                Network: <span className="font-mono">{NETWORK}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard label="Tips received" value={`${fmt(tipTotal)} USDC`} icon="💸" />
              <StatsCard label="Subs revenue" value={`${fmt(subClaimable)} USDC`} sub="Claimable" icon="📅" />
              <StatsCard label="API revenue" value={`${fmt(apiClaimable)} USDC`} sub="Claimable" icon="⚡" />
              <StatsCard label="Content revenue" value={`${fmt(contentClaimable)} USDC`} sub="Claimable" icon="🔒" />
            </div>

            {/* Quick actions */}
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <Link href="/tips" className="p-6 bg-panel border border-border rounded-3xl hover:border-accent transition">
                <div className="text-2xl">💸</div>
                <h3 className="font-bold text-lg mt-2">Tips</h3>
                <p className="text-muted text-sm mt-1">View recent tips, share your tip page</p>
              </Link>
              <Link href="/subscriptions" className="p-6 bg-panel border border-border rounded-3xl hover:border-accent transition">
                <div className="text-2xl">📅</div>
                <h3 className="font-bold text-lg mt-2">Subscriptions</h3>
                <p className="text-muted text-sm mt-1">Create plans, view subscribers, withdraw</p>
              </Link>
              <Link href="/content" className="p-6 bg-panel border border-border rounded-3xl hover:border-accent transition">
                <div className="text-2xl">🔒</div>
                <h3 className="font-bold text-lg mt-2">Paywalled Content</h3>
                <p className="text-muted text-sm mt-1">Gate articles/videos, manage pricing</p>
              </Link>
              <Link href="/api" className="p-6 bg-panel border border-border rounded-3xl hover:border-accent transition">
                <div className="text-2xl">⚡</div>
                <h3 className="font-bold text-lg mt-2">Paid API Endpoints</h3>
                <p className="text-muted text-sm mt-1">Charge per API call in USDC</p>
              </Link>
            </div>

            {/* Share link */}
            <div className="mt-8 p-6 bg-accent rounded-3xl text-white">
              <div className="text-sm opacity-80">Your public payment link</div>
              <div className="text-2xl font-mono mt-1">arcpay.finance/{username}</div>
              <div className="text-sm opacity-80 mt-3">
                Share this link to accept tips, subscriptions, content unlocks — all in USDC.
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
