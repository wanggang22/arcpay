'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CodeTabs } from './CodeTabs';

type Mode = {
  tab: string;
  kicker: string;
  headline: string;
  copy: string;
  href: string;
  cta: string;
  code: string;
};

const MODES: Mode[] = [
  {
    tab: 'Tips',
    kicker: 'ONE-TIME USDC',
    headline: 'Send a tip with a message.',
    copy: 'Every tweet, article, or profile becomes a tip target. Recipient claims via email or wallet. Unclaimed tips stay on-chain under the handle.',
    href: '/gavin',
    cta: 'See a creator page',
    code: `import { ArcPayClient } from '@wanggang22/arcpay-sdk';
const client = new ArcPayClient({ network: 'arc' });

await client.tips.send({
  username: 'gavin',
  amount: '0.005',
  message: 'great post!',
});`,
  },
  {
    tab: 'Subscriptions',
    kicker: 'MONTHLY USDC',
    headline: 'Recurring income in one tx.',
    copy: 'Monthly or yearly plans with per-second accrual. Cancel refunds the unused portion on-chain. 2% protocol fee.',
    href: '/demo-blog',
    cta: 'See the demo blog',
    code: `// 3 months upfront
await client.subs.subscribe(planId, 3);

// paid-until unlocks the paywall
const active = await client.subs.isActive(user, planId);`,
  },
  {
    tab: 'Content paywall',
    kicker: 'PAY ONCE, OWN FOREVER',
    headline: 'Gate articles, videos, files.',
    copy: 'Buyer pays once in USDC, access is an on-chain receipt. Works across devices. Works forever.',
    href: '/demo-product',
    cta: 'See the store demo',
    code: `await client.paywall.purchase(contentId, price);

// Anywhere, anytime:
const owned = await client.paywall.checkAccess(contentId, wallet);`,
  },
  {
    tab: 'Pay-per-call',
    kicker: 'FOR AI AGENTS',
    headline: 'Prepay N API calls in one tx.',
    copy: 'batchPay prepays N credits up-front. SDK auto-signs each call. Server verifies callId on-chain. Perfect for agents billing per inference.',
    href: '/demo-agent',
    cta: 'Watch an agent pay',
    code: `// Prepay 100 call credits
await client.api.batchPay('gavin', 'summarize-paper', 100);

// Each call signed off-chain, verified on-chain
const out = await client.api.call(
  'gavin', 'summarize-paper', input
);`,
  },
];

export function FourModes() {
  const [active, setActive] = useState(0);
  const m = MODES[active];
  return (
    <section id="modes" className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="flex flex-wrap gap-4 md:gap-8 mb-12 text-sm">
        {MODES.map((mode, i) => (
          <button
            key={mode.tab}
            onClick={() => setActive(i)}
            className={`font-mono transition pb-1 ${
              i === active
                ? 'text-accent border-b-2 border-accent'
                : 'text-ink/50 hover:text-ink/80'
            }`}
          >
            {mode.tab}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-7">
          <div className="font-mono text-xs text-accent tracking-wider mb-3">{m.kicker}</div>
          <h3 className="font-display text-3xl md:text-5xl font-semibold leading-tight text-ink">{m.headline}</h3>
          <p className="text-ink/70 text-lg mt-5 max-w-[50ch] leading-relaxed">{m.copy}</p>
          <Link
            href={m.href}
            className="inline-block mt-6 font-semibold text-accent hover:underline underline-offset-4"
          >
            {m.cta} →
          </Link>
        </div>
        <div className="md:col-span-5 w-full">
          <CodeTabs tabs={[{ label: m.tab, code: m.code }]} />
        </div>
      </div>
    </section>
  );
}
