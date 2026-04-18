'use client';
import { ArticleGate } from '@/components/ArticleGate';
import { HackathonPost } from './posts/hackathon-3-days';

export function PostBody({ slug, gated, author }: { slug: string; gated: boolean; author: string }) {
  const { Preview, Paid } = resolve(slug);

  return (
    <div className="prose prose-lg font-serif max-w-none">
      <Preview />
      {gated ? (
        <ArticleGate author={author} previewText="The rest is a paid post. One subscription unlocks every post on this blog, on-chain.">
          <Paid />
        </ArticleGate>
      ) : (
        <Paid />
      )}
    </div>
  );
}

function resolve(slug: string): { Preview: () => JSX.Element; Paid: () => JSX.Element } {
  switch (slug) {
    case 'hackathon-3-days':
      return HackathonPost;
    default:
      return {
        Preview: () => <p>Post body not found.</p>,
        Paid: () => <p />,
      };
  }
}
