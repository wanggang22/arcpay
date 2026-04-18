export interface Post {
  slug: string;
  title: string;
  date: string;
  readMinutes: number;
  excerpt: string;
  author: string;
  tags: string[];
  gated: boolean;
}

export const posts: Post[] = [
  {
    slug: 'hackathon-3-days',
    title: 'How I shipped a 4-mode USDC payment protocol on Arc in 3 days',
    date: '2026-04-17',
    readMinutes: 9,
    excerpt:
      'A weekend build log from the Agentic Economy hackathon. The product, the pivots, what worked, what failed, and the one feature that unexpectedly became the killer demo.',
    author: 'gavin',
    tags: ['hackathon', 'build-log', 'arc', 'usdc', 'x402'],
    gated: true,
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
