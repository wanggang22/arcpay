'use client';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { useAccount, useReadContract } from 'wagmi';
import { ADDRESSES, registryAbi } from '@/lib/config';

export default function EmbedPage() {
  const { address, isConnected } = useAccount();

  const { data: hashes } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getUsernamesByAddress',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: usernameRaw } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getNameByHash',
    args: hashes && hashes.length > 0 ? [hashes[0]] : undefined,
    query: { enabled: !!hashes && hashes.length > 0 },
  });

  const username = (usernameRaw as string | undefined) || 'your-username';

  const iframeSnippet = `<iframe
  src="https://arcpay.finance/embed/tip/${username}"
  width="420" height="320" frameborder="0"
  style="border:0; max-width:100%"
  loading="lazy"
  title="Tip ${username} on ArcPay"></iframe>`;

  const jsAutoSnippet = `<script src="https://arcpay.finance/embed.js" defer></script>
<div data-arcpay="tip" data-user="${username}"></div>`;

  const jsButtonSnippet = `<script src="https://arcpay.finance/embed.js" defer></script>
<button data-arcpay-button data-user="${username}">💸 Tip ${username}</button>`;

  const badgeSnippet = `[![Tip on ArcPay](https://arcpay.finance/badge/${username}.svg)](https://arcpay.finance/${username})`;

  const reactSnippet = `// React / Next.js component
export function TipButton() {
  return (
    <iframe
      src="https://arcpay.finance/embed/tip/${username}"
      width={420} height={320}
      style={{ border: 0, maxWidth: '100%' }}
      title="Tip ${username} on ArcPay"
    />
  );
}`;

  const subscribeIframe = `<iframe
  src="https://arcpay.finance/embed/subscribe/${username}"
  width="420" height="360" frameborder="0"
  style="border:0; max-width:100%"
  loading="lazy"
  title="Subscribe to ${username} on ArcPay"></iframe>`;

  const subscribeGating = `// Client-side gating: is this wallet an active subscriber?
import { readContract } from 'viem/actions';
import { ADDRESSES, subscriptionsAbi } from '@arcpay/sdk';

async function isSubscriber(wallet: \`0x\${string}\`, planId: bigint) {
  const slot = await readContract(publicClient, {
    address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
    functionName: 'activeSubOf', args: [wallet, planId],
  });
  if (slot === 0n) return false;
  const sub = await readContract(publicClient, {
    address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
    functionName: 'getSubscription', args: [slot - 1n],
  });
  return sub.active && Number(sub.paidUntil) * 1000 > Date.now();
}

// Use anywhere: article paywall, Discord bot role, API gate
if (await isSubscriber(visitor.wallet, MY_PLAN_ID)) {
  return renderFullArticle();
}`;

  return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">🧩 Embed anywhere</h1>
            <p className="text-muted text-sm mt-1 max-w-xl">
              Let fans tip you from your blog, Notion, Substack, GitHub README, Dev.to article, or any HTML page. Paste a snippet — zero config, works everywhere.
            </p>
          </div>
        </div>

        {!isConnected && (
          <div className="mt-4 p-4 bg-panel border border-border rounded-2xl text-sm text-muted">
            Connect your wallet to see snippets pre-filled with your username.
          </div>
        )}
        {isConnected && !usernameRaw && (
          <div className="mt-4 p-4 bg-panel border border-amber-400 rounded-2xl text-sm">
            You haven&apos;t registered a username. <a href="/" className="text-accent underline">Register one</a> to embed tip buttons.
          </div>
        )}

        <CopyBlock
          num="1"
          title="iframe — most universal"
          desc="Drop into any HTML page: WordPress, Ghost, Substack, Notion, personal sites."
          code={iframeSnippet}
          preview={
            <iframe
              src={`https://arcpay.finance/embed/tip/${username}`}
              width={420} height={320}
              style={{ border: 0, maxWidth: '100%' }}
              title="preview"
            />
          }
        />

        <CopyBlock
          num="2"
          title="JS SDK — auto-render"
          desc="Include once, scatter <div data-arcpay=&quot;tip&quot;> anywhere. Renders inline."
          code={jsAutoSnippet}
        />

        <CopyBlock
          num="3"
          title="JS SDK — button / modal"
          desc="Render a button that opens a modal on click. Great for sidebar, footer, inline prompts."
          code={jsButtonSnippet}
        />

        <CopyBlock
          num="4"
          title="GitHub README badge"
          desc="One-line Markdown. Always-up-to-date lifetime tips total shown as badge."
          code={badgeSnippet}
          preview={
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://arcpay.finance/badge/${username}.svg`} alt={`Tip ${username}`} style={{ height: 28 }} />
          }
        />

        <CopyBlock
          num="5"
          title="React / Next.js component"
          desc="If you ship a Next.js site, just drop an iframe in JSX."
          code={reactSnippet}
        />

        <div className="mt-12 mb-4">
          <h2 className="text-xl font-bold">📅 Subscriptions — the Patreon replacement</h2>
          <p className="text-muted text-sm mt-1">
            Your readers subscribe in USDC; the chain is your subscriber database.{' '}
            <a href="https://arcpay.finance/demo-blog" target="_blank" rel="noopener noreferrer"
              className="text-accent underline">Live demo: a paywalled blog post ↗</a>
          </p>
        </div>

        <CopyBlock
          num="6"
          title="Subscribe embed — iframe"
          desc="Drop this on your blog / Notion / landing page so readers can subscribe without leaving."
          code={subscribeIframe}
          preview={
            <iframe
              src={`https://arcpay.finance/embed/subscribe/${username}`}
              width={420} height={360}
              style={{ border: 0, maxWidth: '100%' }}
              title="preview"
            />
          }
        />

        <CopyBlock
          num="7"
          title="Subscription gating — check any wallet's status"
          desc="Server-side or client-side, 10 lines of code. No webhook, no database, the contract IS the subscriber DB."
          code={subscribeGating}
        />

        <div className="mt-10 p-5 bg-accent text-white rounded-3xl">
          <div className="font-bold">Why embed?</div>
          <ul className="mt-2 text-sm space-y-1 list-disc list-inside opacity-90">
            <li>Instant USDC settlement to your wallet (sub-second on Arc)</li>
            <li>No Stripe, no KYC, no chargebacks</li>
            <li>Your fans click tip → sign with email/wallet → done</li>
            <li>Works in Notion, Substack, GitHub, personal blog — anywhere iframes/JS work</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function CopyBlock({
  num, title, desc, code, preview,
}: { num: string; title: string; desc: string; code: string; preview?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="mt-6 bg-panel border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-mono flex items-center justify-center">{num}</span>
            {title}
          </div>
          <div className="text-sm text-muted mt-1">{desc}</div>
        </div>
        <button onClick={copy}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-bg transition whitespace-nowrap">
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <pre className="mt-3 text-xs bg-bg p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all font-mono">{code}</pre>
      {preview && (
        <div className="mt-3">
          <div className="text-xs text-muted mb-2">Preview:</div>
          <div>{preview}</div>
        </div>
      )}
    </div>
  );
}
