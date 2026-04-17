'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import { keccak256, stringToBytes } from 'viem';
import { ADDRESSES, subscriptionsAbi } from '@/lib/config';
import { AuthPill } from '@/components/AuthPill';

const AUTHOR = 'gavin';

export default function DemoBlog() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price: bigint }>>([]);
  const [subState, setSubState] = useState<{ active: boolean; paidUntil?: number; planName?: string } | null>(null);
  const [pollKey, setPollKey] = useState(0);

  // Load author plans once
  useEffect(() => {
    if (!pub) return;
    let cancelled = false;
    (async () => {
      const authorHash = keccak256(stringToBytes(AUTHOR));
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
  }, [pub]);

  // Check wallet subscription status; re-check on pollKey bump
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
              if (!cancelled) setSubState({ active: true, paidUntil, planName: plan.name });
              return;
            }
          }
        } catch {}
      }
      if (!cancelled) setSubState({ active: false });
    })();
    return () => { cancelled = true; };
  }, [pub, address, plans, pollKey]);

  // Poll every 5s so a subscription made in another tab auto-unlocks
  useEffect(() => {
    const t = setInterval(() => setPollKey((k) => k + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const isSubscribed = subState?.active === true;

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-gray-900">
      {/* Fake blog header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
              📰
            </div>
            <div className="min-w-0 leading-tight">
              <div className="font-bold font-serif text-base truncate">Gavin&apos;s Substack</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 hidden sm:block">
                pay-with-USDC demo
              </div>
            </div>
          </div>

          {/* Nav + Auth */}
          <div className="flex items-center gap-1">
            <Link href="/faucet"
              className="flex items-center gap-1 text-xs text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
              title="Get free testnet USDC">
              <span>💧</span>
              <span className="hidden sm:inline">Faucet</span>
            </Link>
            <Link href={`/${AUTHOR}`}
              className="flex items-center gap-1 text-xs text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
              title={`Go to @${AUTHOR}'s ArcPay page`}>
              <span>↗</span>
              <span className="hidden sm:inline">Creator</span>
            </Link>
            <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1" />
            <AuthPill />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <article>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Essay · 7 min read</div>
          <h1 className="font-serif text-4xl font-bold leading-tight mb-4">
            How I tripled my newsletter revenue by switching to USDC subscriptions
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center font-bold">G</div>
            <div>
              <div className="font-bold text-gray-900">@{AUTHOR}</div>
              <div>Indie creator · April 16, 2026</div>
            </div>
          </div>

          <div className="prose prose-lg font-serif max-w-none">
            <p className="text-xl text-gray-700 leading-relaxed">
              When I moved my newsletter off Substack to an on-chain subscription, three things happened. My take-home went up 8 percent overnight, readers in Turkey and Argentina started paying in stablecoin, and I stopped worrying about Stripe holds.
            </p>
            <p>
              Most creators don&apos;t think about the infrastructure under their paywall. The dashboard says "monthly recurring revenue" and that&apos;s enough. But the infrastructure is doing a lot of quiet damage: 2.9% plus 30 cents per charge, a month-long delay before payouts clear, no way to serve readers in half the world, a chargeback clock that never sleeps.
            </p>

            {/* Gated content below */}
            {isSubscribed ? (
              <>
                <p>
                  Three weeks ago I switched the whole thing to ArcPay. It took a Saturday afternoon. My subscribers pay in USDC, the funds hit my wallet inside a second, and the <code>activeSubOf(wallet, planId)</code> contract call is the only gate between a reader and my archive.
                </p>
                <p>
                  Here&apos;s what I learned — and what I&apos;d do differently if I were starting today.
                </p>
                <h2 className="font-serif">1. Fees disappear into the margin you didn&apos;t know you had</h2>
                <p>
                  Stripe&apos;s 2.9% feels small until you calculate it on top of the platform fee (Substack&apos;s 10%, Ghost&apos;s 0% but hosting etc., Patreon&apos;s 8% or more). Stack them and you lose a quarter of every dollar before you see it.
                </p>
                <p>
                  ArcPay takes 2% flat. There&apos;s no platform cut on top — I&apos;m the platform. On a $15/mo subscription that&apos;s the difference between $11.20 and $14.70 hitting my wallet. Multiply by a few hundred readers.
                </p>
                <h2 className="font-serif">2. Settlement speed changes what you can do with money</h2>
                <p>
                  Under Stripe my February earnings arrived March 2nd. With USDC on Arc, I cash-flowed a podcast editor hire using last night&apos;s subscriptions. Small thing. Huge thing.
                </p>
                <h2 className="font-serif">3. Geographic reach stops being a policy question</h2>
                <p>
                  Stripe doesn&apos;t operate in 70% of the world by GDP when you include restricted categories. My readers in Lagos, Istanbul, Lahore used to have to route payments through relatives abroad. Now they point a wallet and pay. No friction.
                </p>
                <p>
                  — The second half was unlocked automatically when you subscribed. The page detected your wallet&apos;s on-chain subscription status via a single <code>activeSubOf()</code> call. No login, no account linking, no cookies. Your wallet is the account.
                </p>
                <div className="mt-10 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 not-prose">
                  ✓ Unlocked via <strong>{subState?.planName}</strong> · valid until{' '}
                  {subState?.paidUntil ? new Date(subState.paidUntil * 1000).toLocaleDateString() : '—'}
                </div>
              </>
            ) : (
              <Paywall plans={plans} hasAddress={Boolean(address)} />
            )}
          </div>
        </article>

        {/* Developer hint */}
        <aside className="mt-16 p-6 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-pink-500/5 border border-indigo-100">
          <div className="text-xs uppercase tracking-wider text-indigo-600 font-bold mb-2">For developers</div>
          <div className="text-sm text-gray-700 leading-relaxed">
            This page is a <strong>mock</strong> of any newsletter / SaaS that wants USDC subscriptions. The entire gating logic is 15 lines of client-side code:
          </div>
          <pre className="mt-3 text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
{`// On every page load, ask the chain
const slot = await readContract({
  address: SUBS, abi, functionName: 'activeSubOf',
  args: [visitor.address, planId],
});
if (slot > 0n) {
  const sub = await readContract({
    ...,  functionName: 'getSubscription', args: [slot - 1n],
  });
  const isActive = sub.active && sub.paidUntil * 1000 > Date.now();
  if (isActive) renderFullArticle();
}`}
          </pre>
          <div className="mt-3 text-sm text-gray-700">
            Your app / Discord bot / course platform does the same query. No database, no webhooks, no Stripe dashboard. The contract is the source of truth.
          </div>
          <Link href="/build" className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700">
            See full developer guide →
          </Link>
        </aside>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-gray-500">
          This is a demo page bundled with{' '}
          <Link href="/" className="underline">ArcPay</Link>. The article text is illustrative.
          Try switching wallets / subscribing to see the paywall flip state.
        </div>
      </footer>
    </div>
  );
}

function Paywall({ plans, hasAddress }: { plans: Array<{ id: number; name: string; price: bigint }>; hasAddress: boolean }) {
  return (
    <div className="my-10 not-prose">
      <div className="h-32 bg-gradient-to-b from-transparent to-[#fbf9f5] -mt-32 mb-0" />
      <div className="relative -mt-16 p-8 rounded-2xl border-2 border-indigo-200 bg-white shadow-xl text-center">
        <div className="text-xs uppercase tracking-wider text-indigo-600 font-bold">Subscriber-only</div>
        <h3 className="font-serif text-2xl font-bold mt-2 mb-3">Subscribe to continue reading</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          The rest of this essay is for paid readers. Your wallet becomes your subscription — no account, no password, no cookies.
        </p>

        <div className="w-full max-w-md mx-auto bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <iframe
            src={`/embed/subscribe/${AUTHOR}`}
            width="100%"
            height="320"
            style={{ border: 0 }}
            title={`Subscribe to @${AUTHOR}`}
          />
        </div>

        {!hasAddress && (
          <div className="mt-4 text-xs text-gray-500">
            👆 The button above opens <code>arcpay.finance/{AUTHOR}</code> in a new tab. Sign in there, subscribe, come back — this page will auto-unlock within 5 seconds.
          </div>
        )}
        {hasAddress && (
          <div className="mt-4 text-xs text-gray-500">
            Wallet connected. Subscribe in the other tab — this page polls every 5s.
          </div>
        )}
      </div>
    </div>
  );
}

