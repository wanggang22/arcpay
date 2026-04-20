import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost, posts } from '@/lib/posts';
import { ArticleGate } from '@/components/ArticleGate';
import { AuthPill } from '@/components/AuthPill';
import { PostBody } from './post-body';

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: 'Not found' };
  return {
    title: `${post.title} — gavin's blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://arcpay.finance/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: [`@${post.author}`],
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-gray-900">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/blog" className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-accent shrink-0" />
            <span className="font-bold truncate">gavin&apos;s blog</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/blog" className="text-xs text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
              ← Archive
            </Link>
            <Link href="/faucet" className="flex items-center gap-1 text-xs text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
              💧 <span className="hidden sm:inline">Faucet</span>
            </Link>
            <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1" />
            <AuthPill />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <article>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            {formatDate(post.date)} · {post.readMinutes} min read
            {post.gated && <> · <span className="text-accent font-bold">🔒 Paid</span></>}
          </div>
          <h1 className="font-serif text-4xl font-bold leading-tight mb-4">{post.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-8">
            <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold">G</div>
            <div>
              <div className="font-bold text-gray-900">@{post.author}</div>
              <div>Builder of ArcPay · {formatDate(post.date)}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-8">
            {post.tags.map((t) => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                #{t}
              </span>
            ))}
          </div>

          <PostBody slug={post.slug} gated={post.gated} author={post.author} />
        </article>

        <div className="mt-16 p-5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-600">
          <div className="font-bold text-gray-900">Read more</div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/blog" className="underline hover:text-gray-900">← All posts</Link>
            <Link href={`/${post.author}`} className="underline hover:text-gray-900">@{post.author}&apos;s ArcPay page</Link>
            <Link href="/build" className="underline hover:text-gray-900">Build with ArcPay →</Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-gray-500">
          Written by <Link href={`/${post.author}`} className="underline">@{post.author}</Link>.{' '}
          Paywall powered by <Link href="/" className="underline">ArcPay</Link> on Arc Network.
          Your wallet is your subscription — the gate is a single on-chain read.
        </div>
      </footer>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
