import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

const RESERVED: Record<string, string> = {
  // Product surfaces (redirect to their real home)
  dashboard: 'https://app.arcpay.finance',
  app: 'https://app.arcpay.finance',
  admin: 'https://app.arcpay.finance',
  login: 'https://app.arcpay.finance',
  signin: 'https://app.arcpay.finance',
  signup: 'https://app.arcpay.finance',
  register: 'https://app.arcpay.finance',
  account: 'https://app.arcpay.finance',
  settings: 'https://app.arcpay.finance',
  billing: 'https://app.arcpay.finance',
  // Developer docs
  docs: 'https://arcpay.finance/build',
  doc: 'https://arcpay.finance/build',
  developer: 'https://arcpay.finance/build',
  developers: 'https://arcpay.finance/build',
  help: 'https://arcpay.finance/build',
  support: 'https://arcpay.finance/build',
  guide: 'https://arcpay.finance/build',
  sdk: 'https://arcpay.finance/build',
  // Brand / marketing
  home: 'https://arcpay.finance',
  about: 'https://arcpay.finance',
  pricing: 'https://arcpay.finance',
  shop: 'https://arcpay.finance/demo-product',
  product: 'https://arcpay.finance/demo-product',
  products: 'https://arcpay.finance/demo-product',
  // Compliance / legal
  terms: 'https://arcpay.finance/privacy',
  tos: 'https://arcpay.finance/privacy',
  legal: 'https://arcpay.finance/privacy',
};

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const username = params.username.toLowerCase();
  if (RESERVED[username]) {
    return { title: 'Redirecting…' };
  }
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

export default function UsernameLayout({ children, params }: { children: React.ReactNode; params: { username: string } }) {
  const target = RESERVED[(params.username || '').toLowerCase()];
  if (target) redirect(target);
  return children;
}
