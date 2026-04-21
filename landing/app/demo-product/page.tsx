'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, contentPaywallAbi } from '@/lib/config';
import { AuthPill } from '@/components/AuthPill';

const AUTHOR = 'gavin';

type Content = {
  id: `0x${string}`;
  price: bigint;
  active: boolean;
  totalSales: bigint;
  totalRevenue: bigint;
  metadataURI: string;
};

type Meta = {
  title?: string;
  description?: string;
  url?: string;
  cover?: string;
  features?: string[];
};

export default function DemoProduct() {
  const { address, isConnected } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();

  const [content, setContent] = useState<Content | null>(null);
  const [meta, setMeta] = useState<Meta>({});
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tx, setTx] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load first active content from creator
  useEffect(() => {
    if (!pub) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ids: any = await pub.readContract({
          address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
          functionName: 'getCreatorContents', args: [AUTHOR],
        });
        for (const id of (ids as `0x${string}`[])) {
          const c: any = await pub.readContract({
            address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
            functionName: 'getContent', args: [id],
          });
          if (c.active) {
            if (cancelled) return;
            setContent({
              id,
              price: c.price,
              active: c.active,
              totalSales: c.totalSales,
              totalRevenue: c.totalRevenue,
              metadataURI: c.metadataURI,
            });
            if (c.metadataURI?.startsWith('data:application/json,')) {
              try {
                const parsed = JSON.parse(
                  decodeURIComponent(c.metadataURI.slice('data:application/json,'.length))
                );
                setMeta(parsed);
              } catch {}
            }
            return;
          }
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pub]);

  // Check ownership whenever wallet/content changes
  useEffect(() => {
    if (!pub || !address || !content?.id) { setOwned(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const has: any = await pub.readContract({
          address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
          functionName: 'checkAccess', args: [content.id, address],
        });
        if (!cancelled) setOwned(Boolean(has));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pub, address, content?.id, tx]);

  const buy = async () => {
    if (!wallet || !pub || !content) return;
    setBusy(true); setErr('');
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
        functionName: 'purchase',
        args: [content.id],
        value: content.price,
        gas: 300000n,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash);
      setOwned(true);
    } catch (e: any) {
      setErr(e.shortMessage || e.message || 'Purchase failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <ProductHeader />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading product…</div>
        ) : !content ? (
          <EmptyState />
        ) : (
          <ProductLayout content={content} meta={meta} owned={owned} address={address} busy={busy} err={err} tx={tx} onBuy={buy} />
        )}

        <DevBlock />
      </main>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-2xl font-bold">@{AUTHOR} hasn&apos;t listed a product yet</h2>
      <p className="mt-3 text-gray-600 text-sm">
        The creator needs to go to{' '}
        <a href="https://app.arcpay.finance/content" className="underline text-accent" target="_blank" rel="noopener noreferrer">
          app.arcpay.finance/content
        </a>{' '}
        and add an item first.
      </p>
    </div>
  );
}

// ─── Main product layout ─────────────────────────────────────

function ProductLayout({
  content, meta, owned, address, busy, err, tx, onBuy,
}: {
  content: Content;
  meta: Meta;
  owned: boolean;
  address: string | undefined;
  busy: boolean;
  err: string;
  tx: string | null;
  onBuy: () => void;
}) {
  const priceStr = Number(formatUnits(content.price, 18)).toFixed(4).replace(/\.?0+$/, '');
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
      {/* Left: cover + details */}
      <div className="md:col-span-3">
        <Cover meta={meta} />
        <h1 className="mt-6 text-3xl md:text-4xl font-bold font-serif leading-tight">
          {meta.title || 'Premium digital download'}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm">
            {AUTHOR.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm text-gray-600">
            by{' '}
            <Link href={`/${AUTHOR}`} className="font-bold text-gray-900 hover:text-accent">@{AUTHOR}</Link>
          </div>
        </div>

        <div className="mt-8 prose prose-sm max-w-none">
          {meta.description ? (
            <p>{meta.description}</p>
          ) : (
            <p>A one-time purchase. Lifetime access. On-chain proof of ownership — if the creator&apos;s server disappears tomorrow, your receipt is still valid.</p>
          )}

          <h3 className="font-bold text-base mt-6">What you&apos;re buying</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            {(meta.features && meta.features.length > 0 ? meta.features : [
              'Lifetime access — no subscription, no renewal',
              'On-chain receipt — works even if this website disappears',
              'Instant delivery — download link revealed the moment your tx confirms',
              'No Stripe hold, no chargebacks, no country restrictions',
            ]).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: buy card */}
      <div className="md:col-span-2">
        <div className="md:sticky md:top-20 bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Price</div>
          <div className="mt-1 text-4xl font-bold tracking-tight">${priceStr}</div>
          <div className="text-xs text-gray-500 mt-1">USDC · one-time · lifetime access</div>

          <div className="mt-5">
            {owned ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-bold text-center">
                  ✓ You own this
                </div>
                {meta.url ? (
                  <a href={meta.url} target="_blank" rel="noopener noreferrer"
                    className="block text-center w-full py-3 rounded-xl bg-accent text-white font-bold hover:opacity-90">
                    🔓 Open content ↗
                  </a>
                ) : (
                  <div className="text-xs text-gray-500 text-center">
                    (Creator didn&apos;t attach a download URL to this item.)
                  </div>
                )}
                {tx && (
                  <div className="text-[10px] text-center text-gray-400 font-mono break-all">
                    Tx: {tx}
                  </div>
                )}
              </div>
            ) : address ? (
              <button onClick={onBuy} disabled={busy}
                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold disabled:opacity-60 hover:bg-gray-700 transition">
                {busy ? 'Purchasing…' : `Buy for ${priceStr} USDC`}
              </button>
            ) : (
              <div className="text-center py-3 text-sm text-gray-500 bg-gray-50 rounded-xl">
                Sign in to buy
              </div>
            )}
            {err && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                {err}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>📊 Total sold</span>
              <span className="font-bold text-gray-900">{Number(content.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>💰 Lifetime revenue</span>
              <span className="font-bold text-gray-900">{Number(formatUnits(content.totalRevenue, 18)).toFixed(4)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span>📦 Settlement</span>
              <span className="font-bold text-gray-900">Instant</span>
            </div>
            <div className="flex justify-between">
              <span>🔒 Proof</span>
              <span className="font-bold text-gray-900">On-chain</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cover({ meta }: { meta: Meta }) {
  if (meta.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={meta.cover} alt={meta.title || 'cover'} className="w-full h-80 object-cover rounded-2xl shadow-sm" />;
  }
  return (
    <div className="w-full h-80 rounded-2xl bg-accent flex items-center justify-center shadow-sm">
      <div className="text-8xl">📦</div>
    </div>
  );
}

// ─── Developer explainer ────────────────────────────────────

function DevBlock() {
  return (
    <aside className="mt-20 p-6 rounded-2xl bg-accent/5 border border-accent/10">
      <div className="text-xs uppercase tracking-wider text-accent font-bold mb-2">For developers</div>
      <div className="text-sm text-gray-700 leading-relaxed">
        A mock Gumroad-style product page. The whole gating logic is two contract calls:
      </div>
      <pre className="mt-3 text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
{`// 1. Does this wallet own the item?
const hasAccess = await readContract({
  address: ADDRESSES.contentPaywall, abi,
  functionName: 'checkAccess', args: [contentId, visitor.address],
});

// 2. Not yet — let them buy
await writeContract({
  address: ADDRESSES.contentPaywall, abi,
  functionName: 'purchase',
  args: [contentId],
  value: priceWei,
});

// 3. Receipt is on-chain forever. Even if our server dies,
//    the buyer can prove ownership on any RPC.`}
      </pre>
      <div className="mt-3 text-sm text-gray-700">
        Gumroad, LinkedIn Learning, ebook stores, course platforms — all fit this shape. Your server just checks <code>checkAccess</code> before serving the hidden URL.
      </div>
      <Link href="/build#content" className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700">
        See full developer guide →
      </Link>
    </aside>
  );
}

// ─── Header ─────────────────────────────────────────────────

function ProductHeader() {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center text-lg shadow-sm shrink-0">
            📦
          </div>
          <div className="min-w-0 leading-tight">
            <div className="font-bold font-serif text-base truncate">{AUTHOR}&apos;s Shop</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 hidden sm:block">
              pay-with-USDC demo
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/faucet"
            className="flex items-center gap-1 text-xs text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
            title="Get free testnet USDC">
            <span>💧</span><span className="hidden sm:inline">Faucet</span>
          </Link>
          <Link href={`/${AUTHOR}`}
            className="flex items-center gap-1 text-xs text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
            <span>↗</span><span className="hidden sm:inline">Creator</span>
          </Link>
          <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1" />
          <AuthPill />
        </div>
      </div>
    </header>
  );
}

