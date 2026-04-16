import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const username = params.username.toLowerCase();
  const title = `Tip @${username} with USDC on Arc`;
  const description = `Support @${username} with USDC tips, subscriptions, content unlocks, and pay-per-call API credits on Arc Network. No KYC, no fees on deposit, settles in seconds.`;
  const url = `https://arcpay.finance/${username}`;
  const ogImage = `https://arcpay.finance/api/og?username=${encodeURIComponent(username)}`;

  return {
    title,
    description,
    metadataBase: new URL('https://arcpay.finance'),
    openGraph: {
      title,
      description,
      url,
      siteName: 'ArcPay',
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Tip @${username} on ArcPay` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      site: '@arcpay_finance',
    },
    alternates: { canonical: url },
  };
}

export default function UsernameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
