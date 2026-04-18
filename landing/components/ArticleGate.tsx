'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import { keccak256, stringToBytes } from 'viem';
import { ADDRESSES, subscriptionsAbi } from '@/lib/config';

/**
 * Wrap the paid portion of an article. If the connected wallet has an active
 * subscription to any of this author's plans, children render. Otherwise we
 * show a paywall with an ArcPay Subscribe iframe and poll every 5s so the
 * page auto-unlocks after payment lands on-chain.
 */
export function ArticleGate({
  author,
  children,
  previewText,
}: {
  author: string;
  children: React.ReactNode;
  previewText?: string;
}) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price: bigint }>>([]);
  const [subState, setSubState] = useState<{ active: boolean; planName?: string; paidUntil?: number } | null>(null);
  const [pollKey, setPollKey] = useState(0);

  // Load author plans once
  useEffect(() => {
    if (!pub) return;
    let cancelled = false;
    (async () => {
      const authorHash = keccak256(stringToBytes(author));
      const out: any[] = [];
      for (let i = 0; i < 20; i++) {
        try {
          const p: any = await pub.readContract({
            address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
            functionName: 'getPlan', args: [BigInt(i)],
          });
          if (p.creatorHash === authorHash && p.active) {
            out.push({ id: i, name: p.name, price: p.pricePerMonth });
          }
        } catch { break; }
      }
      if (!cancelled) setPlans(out);
    })();
    return () => { cancelled = true; };
  }, [pub, author]);

  // Check subscription status
  useEffect(() => {
    if (!pub || !address || plans.length === 0) { setSubState(null); return; }
    let cancelled = false;
    (async () => {
      for (const plan of plans) {
        try {
          const slot: any = await pub.readContract({
            address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
            functionName: 'activeSubOf', args: [address, BigInt(plan.id)],
          });
          if (slot > 0n) {
            const sub: any = await pub.readContract({
              address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
              functionName: 'getSubscription', args: [slot - 1n],
            });
            const paidUntil = Number(sub.paidUntil);
            if (sub.active && paidUntil * 1000 > Date.now()) {
              if (!cancelled) setSubState({ active: true, planName: plan.name, paidUntil });
              return;
            }
          }
        } catch {}
      }
      if (!cancelled) setSubState({ active: false });
    })();
    return () => { cancelled = true; };
  }, [pub, address, plans, pollKey]);

  // Poll every 5s
  useEffect(() => {
    const t = setInterval(() => setPollKey((k) => k + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const isSubscribed = subState?.active === true;

  if (isSubscribed) {
    return (
      <>
        {children}
        <div className="mt-10 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 not-prose">
          ✓ Unlocked via <strong>{subState?.planName}</strong>
          {subState?.paidUntil && <> · valid until {new Date(subState.paidUntil * 1000).toLocaleDateString()}</>}
        </div>
      </>
    );
  }

  return (
    <div className="my-10 not-prose">
      <div className="h-32 bg-gradient-to-b from-transparent to-white -mt-32 mb-0" />
      <div className="relative -mt-16 p-8 rounded-2xl border-2 border-indigo-200 bg-white shadow-xl text-center">
        <div className="text-xs uppercase tracking-wider text-indigo-600 font-bold">Subscriber-only</div>
        <h3 className="font-serif text-2xl font-bold mt-2 mb-3">Subscribe to read the rest</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          {previewText || 'Your wallet is your subscription — no account, no password, no cookies.'}
        </p>

        <div className="w-full max-w-md mx-auto bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <iframe
            src={`/embed/subscribe/${author}`}
            width="100%"
            height="340"
            style={{ border: 0 }}
            title={`Subscribe to @${author}`}
          />
        </div>

        <div className="mt-4 text-xs text-gray-500">
          {address
            ? 'Wallet connected — subscribe in the popup, page auto-unlocks in 5 s.'
            : 'Need test USDC? '}
          {!address && <Link href="/faucet" className="underline text-indigo-600">Grab some at /faucet</Link>}
        </div>
      </div>
    </div>
  );
}
