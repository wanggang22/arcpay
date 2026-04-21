'use client';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Lazy-load the wallet/auth stack only on pages that actually need it.
// The marketing pages (/, /privacy, /blog, /blog/[slug]) never touch Privy,
// wagmi, or react-query — so they don't need ~200 KB of wallet JS in the
// initial bundle.
const AuthProviders = dynamic(() => import('./providers-auth'), {
  ssr: false,
  loading: () => null,
});

// Pages that do NOT use any wallet / auth hooks. Keep this list tight —
// adding a page that actually needs auth will throw `useConfig must be
// used within WagmiProvider` at build time on that page.
const MARKETING_ROUTES = new Set(['/', '/privacy', '/blog']);

function isMarketingPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return MARKETING_ROUTES.has(pathname);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isMarketingPath(pathname)) {
    return <>{children}</>;
  }
  return <AuthProviders>{children}</AuthProviders>;
}
