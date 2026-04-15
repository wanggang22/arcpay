'use client';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { formatUnits, keccak256, stringToBytes } from 'viem';
import { ADDRESSES, tipJarFullAbi, registryAbi, NETWORK } from '@/lib/config';
import Link from 'next/link';

export default function TipsPage() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const [username, setUsername] = useState<string | null>(null);
  const [tips, setTips] = useState<any[]>([]);

  const { data: hashes } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getUsernamesByAddress',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: name } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getNameByHash',
    args: hashes && hashes.length > 0 ? [hashes[0]] : undefined, query: { enabled: !!hashes && hashes.length > 0 },
  });

  useEffect(() => { if (name) setUsername(name); }, [name]);

  const { data: lifetime } = useReadContract({
    address: ADDRESSES.tipJar, abi: tipJarFullAbi, functionName: 'getLifetimeReceived',
    args: username ? [username] : undefined, query: { enabled: !!username, refetchInterval: 5000 },
  });
  const { data: tipIds } = useReadContract({
    address: ADDRESSES.tipJar, abi: tipJarFullAbi, functionName: 'getTipsByCreator',
    args: username ? [username] : undefined, query: { enabled: !!username, refetchInterval: 5000 },
  });

  useEffect(() => {
    if (!pub || !tipIds) return;
    const load = async () => {
      const out = [];
      for (const id of [...tipIds].reverse().slice(0, 20)) {
        const t: any = await pub.readContract({
          address: ADDRESSES.tipJar, abi: tipJarFullAbi, functionName: 'getTip', args: [id],
        });
        out.push({ id, ...t });
      }
      setTips(out);
    };
    load();
  }, [pub, tipIds]);

  if (!username) return <Shell><p className="text-muted">Register a username first.</p></Shell>;

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">💸 Tips</h1>
          <p className="text-muted text-sm mt-1">Lifetime tips received to <span className="font-mono">@{username}</span></p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">LIFETIME</div>
          <div className="text-2xl font-bold">{lifetime ? Number(formatUnits(lifetime, 18)).toFixed(4) : '0.0000'} USDC</div>
        </div>
      </div>

      <div className="bg-arc-gradient text-white p-6 rounded-3xl mb-8">
        <div className="text-sm opacity-80">Share your tip link</div>
        <div className="text-xl font-mono mt-1 flex items-center gap-3">
          <span>{NETWORK === 'testnet' ? 'arcpay.io' : 'localhost:4000'}/{username}</span>
          <button onClick={() => navigator.clipboard.writeText(
            NETWORK === 'testnet' ? `https://arcpay.io/${username}` : `http://localhost:4000/${username}`
          )} className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold hover:bg-white/30">
            Copy
          </button>
        </div>
        <div className="text-sm opacity-80 mt-3">
          Fans click → see tip page → connect wallet → send USDC. 2% fee. Done.
        </div>
      </div>

      <h2 className="text-lg font-bold mb-3">Recent tips</h2>
      {tips.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-8 text-center text-muted">
          No tips yet. Share your link to get started!
        </div>
      ) : (
        <div className="space-y-2">
          {tips.map(t => (
            <div key={t.id.toString()} className="bg-panel border border-border rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-arc-gradient flex items-center justify-center text-white font-bold">
                {t.from.slice(2, 3).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-muted">{t.from.slice(0, 8)}...{t.from.slice(-4)}</div>
                {t.message && <div className="text-sm mt-1">{t.message}</div>}
                <div className="text-xs text-muted mt-1">{new Date(Number(t.timestamp) * 1000).toLocaleString()}</div>
              </div>
              <div className="font-bold">+{formatUnits(t.amount, 18)} USDC</div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
