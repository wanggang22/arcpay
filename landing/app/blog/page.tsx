import Link from 'next/link';
import type { Metadata } from 'next';
import { posts } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'Blog — gavin on ArcPay',
  description:
    'Build logs, x402 protocol notes, and creator-economy product thinking from the builder of ArcPay.',
  openGraph: {
    title: 'gavin\'s blog',
    description: 'Build logs, x402 protocol notes, and creator-economy product thinking.',
    url: 'https://arcpay.finance/blog',
    type: 'website',
  },
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#fbf9f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-arc-gradient" />
            <span className="font-bold">ArcPay</span>
            <span className="text-xs text-gray-400">/ blog</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/build" className="hover:text-ink">Docs</Link>
            <Link href="/gavin" className="hover:text-ink">@gavin</Link>
            <Link href="/faucet" className="hover:text-ink">💧 Faucet</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-wider text-indigo-600 font-bold">Dogfooding ArcPay</div>
          <h1 className="font-serif text-4xl font-bold mt-2">gavin&apos;s blog</h1>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Build logs, protocol notes, product thinking. This blog runs on ArcPay — free previews,
            paid subscription for the full post. The gate is a single{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">activeSubOf(wallet, planId)</code> call.
          </p>
        </div>

        <div className="space-y-6">
          {posts.map((p) => (
            <article key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="block p-5 rounded-2xl bg-white border border-gray-200 hover:border-indigo-400 hover:shadow-sm transition">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <time>{formatDate(p.date)}</time>
                  <span>·</span>
                  <span>{p.readMinutes} min read</span>
                  {p.gated && (
                    <>
                      <span>·</span>
                      <span className="text-indigo-600 font-bold">🔒 Paid</span>
                    </>
                  )}
                </div>
                <h2 className="font-serif text-xl font-bold leading-tight hover:text-indigo-700">
                  {p.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{p.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      #{t}
                    </span>
                  ))}
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-16 p-5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-600">
          <div className="font-bold text-gray-900">Subscribe for the full archive</div>
          <p className="mt-2 leading-relaxed">
            One-time USDC subscription gives you every paid post. The subscription itself is on-chain:
            cancel anytime, get a prorated refund for unused time.
          </p>
          <Link href="/gavin?tab=subscribe" className="mt-3 inline-block px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700">
            Subscribe →
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-16 py-8">
        <div className="max-w-3xl mx-auto px-6 text-xs text-gray-500">
          Written by <Link href="/gavin" className="underline hover:text-gray-900">@gavin</Link>.{' '}
          Paywall powered by <Link href="/" className="underline hover:text-gray-900">ArcPay</Link> on Arc Network.
        </div>
      </footer>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
