import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — ArcPay',
  description: 'ArcPay privacy policy: what we collect, what we don\'t, and how your on-chain data is handled.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent" />
          <span className="font-bold">ArcPay</span>
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 prose prose-sm">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: 2026-04-17</p>

        <h2 className="text-xl font-bold mt-8 mb-2">Summary</h2>
        <p>ArcPay is a payment protocol on the Arc Network. Most data — payments, balances, creator registrations — is public on-chain. We operate a minimal off-chain backend strictly for: OAuth handle verification (X/Twitter, Google, etc.), social-login wallet creation (via Privy), and serving static UI.</p>
        <p><strong>We do not sell your data. We do not run ads. We do not track you across the web.</strong></p>

        <h2 className="text-xl font-bold mt-8 mb-2">What we collect</h2>
        <h3 className="font-bold mt-4">From the browser extension</h3>
        <ul className="list-disc pl-6 text-sm space-y-1">
          <li>The extension reads the DOM of x.com / twitter.com to extract the author handle of each visible tweet. This runs entirely on your device.</li>
          <li><strong>No data leaves your device</strong> until you explicitly click the 💸 Tip button, which opens <code>arcpay.finance/&#123;handle&#125;</code> in a new tab.</li>
          <li>The extension stores no cookies, no identifiers, and makes no background HTTP requests.</li>
        </ul>

        <h3 className="font-bold mt-4">From arcpay.finance and app.arcpay.finance</h3>
        <ul className="list-disc pl-6 text-sm space-y-1">
          <li><strong>Wallet address</strong> — when you connect a wallet or sign in.</li>
          <li><strong>Email / social identifiers</strong> — only if you log in with email, Google, Twitter/X, Discord, Farcaster, or GitHub. Managed by <a href="https://privy.io/privacy-policy" className="underline">Privy</a>.</li>
          <li><strong>X/Twitter handle</strong> — if you complete the claim flow (<code>/claim</code>), we perform the OAuth 2.0 PKCE flow and read your handle. We do not post on your behalf. We do not read your DMs or tweets.</li>
          <li><strong>Request logs</strong> — standard Vercel edge logs (IP, user-agent, path) for 24 hours for abuse detection. Not linked to wallet or identity.</li>
        </ul>

        <h3 className="font-bold mt-4">On-chain (public, by design)</h3>
        <ul className="list-disc pl-6 text-sm space-y-1">
          <li>Tip amounts + messages + sender/recipient addresses (via TipJar, TipJarByHandle).</li>
          <li>Subscription purchases and active status.</li>
          <li>Content unlocks and API call receipts.</li>
          <li>Usernames registered in UsernameRegistry.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-2">Third parties</h2>
        <ul className="list-disc pl-6 text-sm space-y-1">
          <li><strong>Privy</strong> — authentication + embedded wallets. <a href="https://privy.io/privacy-policy" className="underline">Privy policy</a></li>
          <li><strong>Vercel</strong> — hosting, edge functions, analytics-free logs. <a href="https://vercel.com/legal/privacy-policy" className="underline">Vercel policy</a></li>
          <li><strong>X (Twitter) API</strong> — handle lookups via Bearer Token + OAuth 2.0 for claim flow. <a href="https://twitter.com/en/privacy" className="underline">X policy</a></li>
          <li><strong>Arc Network</strong> — public L1 RPC.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-2">Cookies</h2>
        <p className="text-sm">Short-lived (10 min) HttpOnly cookies used during the X OAuth flow only: <code>arcpay_state</code>, <code>arcpay_pkce</code>, <code>arcpay_recipient</code>. Deleted immediately after callback. No tracking cookies.</p>

        <h2 className="text-xl font-bold mt-8 mb-2">Data deletion</h2>
        <p className="text-sm">On-chain data is immutable and cannot be deleted. To stop associating your wallet with ArcPay, simply stop using the service — nothing off-chain requires deletion because we store nothing off-chain beyond the 24-hour edge logs, which expire automatically.</p>

        <h2 className="text-xl font-bold mt-8 mb-2">Contact</h2>
        <p className="text-sm">Questions: open an issue at <a href="https://github.com/wanggang22/arcpay/issues" className="underline">github.com/wanggang22/arcpay</a>.</p>
      </main>
    </div>
  );
}
