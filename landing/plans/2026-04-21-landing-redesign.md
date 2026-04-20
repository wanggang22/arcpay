# ArcPay Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute `landing/specs/2026-04-21-landing-redesign.md` — redesign arcpay.finance landing page to a Vercel-skeleton + Resend-voice aesthetic with a memorable 4-path convergence hero, and ship SDK v0.1.1 with a real `batchPay` wrapper so all marketed code is truthful.

**Architecture:** Four phases. **Phase A** closes the marketing-vs-code gap by shipping `@wanggang22/arcpay-sdk@0.1.1` with a `PayPerCallClient.batchPay` wrapper. **Phase B** rewrites `landing/app/page.tsx` + creates 3 new components (Convergence, CodeTabs, CopyLine) + updates tokens and fonts. **Phase C** runs the 7-step QA gate from spec §13. **Phase D** deploys to production.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, TypeScript, viem (v2), next/font/google (Fraunces + Geist Sans + Geist Mono), tsup (SDK build). Chrome DevTools MCP for QA screenshots. npm for SDK publish.

**Spec reference:** `landing/specs/2026-04-21-landing-redesign.md` (13 sections, ~320 lines). Every task below references a spec section.

---

## Phase A — SDK v0.1.1 (blocks Phase B §4.4 truthfulness)

### Task A1: Add batchPay smoke test (red phase)

**Files:**
- Modify: `sdk/js/test/smoke.test.ts` (append new section before final log)

**Context:** The SDK uses a single `smoke.test.ts` that runs end-to-end against `C:/Users/ASUS/arc-accounts/account{7,8}/.env` private keys. Match that pattern. Add a step that prepays 3 API credits via `batchPay` and asserts 3 callIds come back.

- [ ] **Step 1: Read the existing smoke test to learn its structure**

Read: `sdk/js/test/smoke.test.ts` — note the numbered console.log sections ("1. Register creator...", "2. Fan sends...", etc.), the `creator`/`fan` clients, and the endpoint-registration pattern used elsewhere.

- [ ] **Step 2: Append batchPay test block at the end of smoke.test.ts before any final log**

Add this block after the existing last test section:

```ts
console.log('N. Creator registers pay-per-call endpoint...');
await creator.api.registerEndpoint(username, 'summarize-paper', '0.001');
console.log('   ✓ endpoint summarize-paper at 0.001 USDC/call\n');

console.log('N+1. Fan batchPays 3 credits...');
const batchTx = await fan.api.batchPay(username, 'summarize-paper', 3);
console.log(`   ✓ batchPay tx: ${batchTx}`);
console.log('   ✓ 3 credits prepaid in one transaction\n');
```

Replace `N` and `N+1` with actual next numbers in sequence (read the file to find current highest).

- [ ] **Step 3: Run smoke test to verify it fails with "method not defined"**

Run: `cd sdk/js && npm test`
Expected: FAIL with `TypeError: fan.api.batchPay is not a function` or similar. If it fails for a different reason (e.g. local testnet not running), start the local testnet first, then rerun.

---

### Task A2: Implement PayPerCallClient.batchPay (green phase)

**Files:**
- Modify: `sdk/js/src/client.ts:290-334` (PayPerCallClient class block)

- [ ] **Step 1: Read the existing PayPerCallClient class**

Read: `sdk/js/src/client.ts:290-334` — note how `pay()` works as the single-call analog. Your new `batchPay` follows the same shape but calls `batchPay` on the contract and sets `value = pricePerCall * count`.

- [ ] **Step 2: Add batchPay method to PayPerCallClient**

Insert this method inside the `PayPerCallClient` class, after `pay()` and before `getEndpointByName()`:

```ts
async batchPay(username: string, endpointName: string, count: number | bigint): Promise<Hex> {
  const { walletClient, account } = this.client._requireWallet();
  const endpoint = await this.getEndpointByName(username, endpointName);
  const countBig = typeof count === 'bigint' ? count : BigInt(count);
  const value = endpoint.pricePerCall * countBig;
  const hash = await walletClient.writeContract({
    address: this.client.config.addresses.payPerCall,
    abi: payPerCallAbi, functionName: 'batchPay',
    args: [endpoint.id, countBig], value,
    account, chain: this.client.config.chain,
  });
  await this.client.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
```

- [ ] **Step 3: Run smoke test and verify it passes**

Run: `cd sdk/js && npm test`
Expected: PASS. Both lines `N. Creator registers pay-per-call endpoint...` and `N+1. Fan batchPays 3 credits...` complete with a tx hash returned and no thrown errors.

- [ ] **Step 4: Commit**

```bash
cd sdk/js
git add test/smoke.test.ts src/client.ts
git commit -m "feat(sdk): add PayPerCallClient.batchPay wrapper

Wraps the existing on-chain PayPerCall.sol::batchPay(bytes32 endpointId,
uint256 count). Resolves endpointId via getEndpointByName and computes
value = pricePerCall * count. Matches the pattern already used in
landing/app/demo-agent/page.tsx so marketing code can truthfully show
client.api.batchPay(username, endpointName, count)."
```

---

### Task A3: Build and verify export chain

**Files:**
- Modify: `sdk/js/package.json:3` (version bump)

- [ ] **Step 1: Check that index.ts re-exports the client**

Read: `sdk/js/src/index.ts`. Confirm `ArcPayClient` (or the `PayPerCallClient` via the client's `api` property) is exported. No change needed if the default `export { ArcPayClient } from './client'` is in place — the `api` sub-client is accessed via `client.api.batchPay()` at runtime and does NOT need a separate named export.

- [ ] **Step 2: Bump version to 0.1.1**

Edit `sdk/js/package.json` line 3: change `"version": "0.1.0"` to `"version": "0.1.1"`.

- [ ] **Step 3: Build the package**

Run: `cd sdk/js && npm run build`
Expected: `tsup` produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`. Zero errors.

- [ ] **Step 4: Verify batchPay appears in compiled output**

Run: `grep -n "batchPay" sdk/js/dist/index.js`
Expected: at least two matches (one method definition, one from test compat).

- [ ] **Step 5: Commit version bump**

```bash
cd sdk/js
git add package.json
git commit -m "chore(sdk): bump to v0.1.1 with batchPay wrapper"
```

---

### Task A4: Publish SDK v0.1.1 to npm and smoke-test from fresh install

**Files:** none modified in repo; publishes `@wanggang22/arcpay-sdk@0.1.1`.

- [ ] **Step 1: Confirm npm auth**

Run: `npm whoami`
Expected: `wanggang22` (or the account that owns `@wanggang22/arcpay-sdk`). If not, `npm login` before continuing.

- [ ] **Step 2: Publish**

Run: `cd sdk/js && npm publish --access public`
Expected: `+ @wanggang22/arcpay-sdk@0.1.1`. If npm prompts for OTP, enter it.

- [ ] **Step 3: Smoke-test from an empty scratch directory**

```bash
mkdir /tmp/arcpay-smoke && cd /tmp/arcpay-smoke
npm init -y
npm install @wanggang22/arcpay-sdk@0.1.1
node -e "const { ArcPayClient } = require('@wanggang22/arcpay-sdk'); const c = new ArcPayClient({ network: 'local' }); console.log(typeof c.api.batchPay);"
```

Expected: `function`. If it prints `undefined`, the publish did not include the wrapper — investigate before unblocking Phase B.

- [ ] **Step 4: Tag the release**

```bash
cd sdk/js
git tag -a sdk-v0.1.1 -m "SDK v0.1.1: add batchPay wrapper"
```

Phase A complete. SDK v0.1.1 is live on npm. Proceed to Phase B.

---

## Phase B — Landing redesign

### Task B1: Update tailwind.config.ts (palette + fonts + deprecated aliases)

**Files:**
- Modify: `landing/tailwind.config.ts` (full rewrite of the theme block)

Spec refs: §3 Palette, §3 Typography, §9 Risks (deprecated-alias strategy).

- [ ] **Step 1: Rewrite tailwind.config.ts**

Overwrite with:

```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0f',
        paper: '#f7f4ee',
        accent: '#2d4a3e',
        gold: '#b8a47e',
        hairline: 'rgba(10,10,15,0.10)',
        /** @deprecated kept for sub-pages during landing-redesign follow-up */
        accent2: '#d65b9c',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia'],
      },
      backgroundImage: {
        /** @deprecated kept for sub-pages during landing-redesign follow-up */
        'arc-gradient': 'linear-gradient(135deg, #5b5bd6 0%, #d65b9c 50%, #f59e0b 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Typecheck**

Run: `cd landing && npx tsc --noEmit`
Expected: no new errors related to the config file.

- [ ] **Step 3: Commit**

```bash
cd landing
git add tailwind.config.ts
git commit -m "feat(landing): new token palette (forest green + ivory), deprecated aliases for sub-pages"
```

---

### Task B2: Add next/font imports to app/layout.tsx

**Files:**
- Modify: `landing/app/layout.tsx` (add font loaders + CSS var bindings)

Spec ref: §3 Typography, §8.1 file 2.

- [ ] **Step 1: Read current layout.tsx to find body class insertion point**

Read: `landing/app/layout.tsx` in full.

- [ ] **Step 2: Add font imports + CSS vars**

At the top (under existing imports) add:

```ts
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-fraunces',
});
const geistSans = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-geist-sans',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-geist-mono',
});
```

Then in the JSX, ensure the `<body>` has the three variable classes attached. Example:

```tsx
<html lang="en" className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable}`}>
  <body className="bg-paper text-ink font-sans antialiased">
    {children}
  </body>
</html>
```

- [ ] **Step 3: Start dev server and verify no font loading errors**

Run: `cd landing && npm run dev`
Open: `http://localhost:3000/`
DevTools Network tab → confirm 3 Google Fonts CSS requests return 200, no CORS errors, no `font-family: undefined` in computed styles on `<body>`.

- [ ] **Step 4: Commit**

```bash
cd landing
git add app/layout.tsx
git commit -m "feat(landing): load Fraunces + Geist Sans + Geist Mono via next/font"
```

---

### Task B3: Map font CSS vars in globals.css

**Files:**
- Modify: `landing/app/globals.css`

Spec ref: §8.1 file 3.

- [ ] **Step 1: Current file check**

Read: `landing/app/globals.css` (7 lines currently). Confirm it just has `@tailwind` directives.

- [ ] **Step 2: Extend globals.css**

Append:

```css
/* Font variables get set by next/font in layout.tsx. This block ensures
   utility classes that bypass Tailwind fontFamily still resolve. */
:root {
  --font-fraunces: var(--font-fraunces);
  --font-geist-sans: var(--font-geist-sans);
  --font-geist-mono: var(--font-geist-mono);
}

html { font-feature-settings: 'ss01', 'ss02'; }
body { font-family: var(--font-geist-sans), ui-sans-serif, system-ui; }
```

- [ ] **Step 3: Commit**

```bash
cd landing
git add app/globals.css
git commit -m "feat(landing): wire font CSS variables in globals.css"
```

---

### Task B4: Pin landing to @wanggang22/arcpay-sdk@^0.1.1

**Files:**
- Modify: `landing/package.json`

Spec ref: §13 QA gate 7 (pinned version).

- [ ] **Step 1: Check current pin**

Run: `grep arcpay-sdk landing/package.json`

- [ ] **Step 2: Update to ^0.1.1**

If the dep exists, change `"@wanggang22/arcpay-sdk": "^0.1.0"` to `"^0.1.1"`. If it does not exist, add it to `dependencies`.

- [ ] **Step 3: Install**

Run: `cd landing && npm install`
Expected: resolves `@wanggang22/arcpay-sdk@0.1.1` (check `landing/package-lock.json` for the version).

- [ ] **Step 4: Commit**

```bash
cd landing
git add package.json package-lock.json
git commit -m "chore(landing): pin SDK to ^0.1.1 (for batchPay)"
```

---

### Task B5: Create CopyLine component

**Files:**
- Create: `landing/components/CopyLine.tsx`

Spec ref: §4.1 Hero (`$ npm create arc-app` click-to-copy chip), §4.8 Get started (`$ npm create arc-app@latest` click-to-copy), §8.1 file 8.

- [ ] **Step 1: Write the component**

Create `landing/components/CopyLine.tsx` with:

```tsx
'use client';
import { useState } from 'react';

export function CopyLine({ text, prefix = '$' }: { text: string; prefix?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-hairline bg-ink/5 hover:bg-ink/10 font-mono text-sm text-ink transition"
      aria-label={`Copy ${text}`}
    >
      <span className="text-ink/40">{prefix}</span>
      <span>{text}</span>
      <span className="text-ink/40 ml-1 text-xs">
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Visually verify in dev server**

Temporarily import into `app/page.tsx` hero area: `<CopyLine text="npm create arc-app" />`. Click it. Verify "copy" label flips to "copied" briefly, and actual clipboard content matches (paste elsewhere to confirm).

- [ ] **Step 3: Commit**

```bash
cd landing
git add components/CopyLine.tsx
git commit -m "feat(landing): add CopyLine component (click-to-copy mono chip)"
```

---

### Task B6: Create Convergence SVG component (with 90-min fallback)

**Files:**
- Create: `landing/components/Convergence.tsx`

Spec refs: §4.1 Hero (right column), §9 Risks (90-min SVG fallback), §8.1 file 6.

- [ ] **Step 1: Write the baseline Convergence component**

Create `landing/components/Convergence.tsx`:

```tsx
'use client';
import { useEffect, useRef } from 'react';

export function Convergence() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = svg.querySelectorAll<SVGPathElement>('path[data-animate]');
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      p.style.transition = `stroke-dashoffset 1.2s ease-out ${i * 0.08}s`;
      requestAnimationFrame(() => {
        p.style.strokeDashoffset = '0';
      });
    });
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 520 520" className="w-full h-auto">
      {/* Four source nodes */}
      <SourcePill x={40} y={40} label="tweet" />
      <SourcePill x={340} y={40} label="/article" />
      <SourcePill x={40} y={440} label="curl" />
      <SourcePill x={340} y={440} label="agent.py" />
      {/* Four paths converging to center */}
      <path data-animate d="M 100 60 Q 200 200 260 240" fill="none" stroke="#0a0a0f" strokeOpacity="0.2" strokeWidth="1.5" />
      <path data-animate d="M 400 60 Q 320 200 260 240" fill="none" stroke="#0a0a0f" strokeOpacity="0.2" strokeWidth="1.5" />
      <path data-animate d="M 100 460 Q 200 320 260 280" fill="none" stroke="#0a0a0f" strokeOpacity="0.2" strokeWidth="1.5" />
      <path data-animate d="M 400 460 Q 320 320 260 280" fill="none" stroke="#0a0a0f" strokeOpacity="0.2" strokeWidth="1.5" />
      {/* Center URL pill */}
      <g transform="translate(260,260)">
        <rect x="-130" y="-24" width="260" height="48" rx="24" fill="#2d4a3e" fillOpacity="0.08" stroke="#2d4a3e" strokeWidth="1.5" />
        <text x="0" y="6" textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="16" fill="#0a0a0f">
          arcpay.finance/<tspan fontFamily="var(--font-fraunces)" fontStyle="italic" fill="#2d4a3e">@gavin</tspan>
        </text>
      </g>
    </svg>
  );
}

function SourcePill({ x, y, label }: { x: number; y: number; label: string }) {
  const w = label.length * 8 + 20;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w / 2} y="-14" width={w} height="28" rx="14" fill="#f7f4ee" stroke="#0a0a0f" strokeOpacity="0.15" strokeWidth="1" />
      <text x="0" y="4" textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="12" fill="#0a0a0f">{label}</text>
    </g>
  );
}
```

- [ ] **Step 2: Visual dogfood in dev server — 90 min budget**

Open `/` in the browser with the component wired into Hero (see Task B9 step 3 for wire-up once Hero exists — or temp-mount in a blank scratch page for isolation). Evaluate against spec §4.1 acceptance: "Four source nodes at corners ... four bezier paths converge ... center pill with mono URL + Fraunces @handle italic." Iterate geometry up to **90 minutes**.

If at the 90-minute mark the SVG still does not feel distinctive (compare side-by-side against Stripe `/customers` and Linear `/method` in a second tab), STOP and switch to the typographic fallback in Task B6b.

- [ ] **Step 3: Commit whichever variant ships**

```bash
cd landing
git add components/Convergence.tsx
git commit -m "feat(landing): add 4-path Convergence hero SVG"
```

---

### Task B6b: Typographic hero fallback (ONLY if B6 times out)

**Files:**
- Modify: `landing/components/Convergence.tsx` (replace SVG with typographic version)

Spec ref: §9 Risks (90-min SVG fallback).

- [ ] **Step 1: Replace body of Convergence.tsx**

```tsx
'use client';
export function Convergence() {
  return (
    <div className="relative flex items-center justify-center aspect-square">
      {/* Hairline concentric rings */}
      <div className="absolute inset-8 rounded-full border border-hairline" />
      <div className="absolute inset-20 rounded-full border border-hairline" />
      <div className="absolute inset-32 rounded-full border border-hairline" />
      {/* Center URL pill */}
      <div className="relative px-6 py-4 rounded-full bg-accent/5 border border-accent/30">
        <span className="font-mono text-2xl md:text-3xl text-ink">
          arcpay.finance/
          <span className="font-display italic text-accent">@gavin</span>
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd landing
git add components/Convergence.tsx
git commit -m "feat(landing): typographic hero fallback (90-min SVG budget exceeded)"
```

---

### Task B7: Create CodeTabs component

**Files:**
- Create: `landing/components/CodeTabs.tsx`

Spec refs: §4.3 Four modes (per-tab right column), §4.4 For developers (3-tab code card), §8.1 file 7.

- [ ] **Step 1: Write CodeTabs**

```tsx
'use client';
import { useState } from 'react';

type Tab = { label: string; lang?: string; code: string };

export function CodeTabs({ tabs, initial = 0 }: { tabs: Tab[]; initial?: number }) {
  const [active, setActive] = useState(initial);
  const current = tabs[active];
  return (
    <div className="rounded-2xl border border-hairline bg-ink text-paper overflow-hidden">
      <div className="flex items-center border-b border-white/10">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2.5 text-xs font-mono transition ${
              i === active ? 'text-paper border-b-2 border-accent' : 'text-paper/50 hover:text-paper/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className="p-5 md:p-6 font-mono text-xs md:text-sm overflow-x-auto leading-relaxed">
        <code>{current.code}</code>
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd landing
git add components/CodeTabs.tsx
git commit -m "feat(landing): add CodeTabs component (reused in Four modes + For devs)"
```

---

### Task B8: Rewrite page.tsx — scaffold + Hero section

**Files:**
- Modify: `landing/app/page.tsx` (overwrite — full rewrite, sections added one task at a time starting here)

Spec ref: §4.1 Hero.

- [ ] **Step 1: Overwrite page.tsx with scaffold + Hero**

```tsx
import Link from 'next/link';
import { Convergence } from '@/components/Convergence';
import { CopyLine } from '@/components/CopyLine';

export default function Page() {
  return (
    <div className="bg-paper text-ink">
      <Nav />
      <Hero />
      {/* Sections added in tasks B9–B15 */}
    </div>
  );
}

function Nav() {
  return (
    <nav className="max-w-6xl mx-auto px-6 md:px-10 flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg">
        <span className="text-accent">⚡</span>
        ArcPay
      </Link>
      <div className="flex items-center gap-5 text-sm">
        <a href="#modes" className="hover:text-accent hidden sm:inline">Modes</a>
        <Link href="/build" className="hover:text-accent">Build</Link>
        <a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer" className="hover:text-accent hidden sm:inline">GitHub</a>
        <Link href="/dashboard" className="px-4 py-2 rounded-full bg-ink text-paper text-sm font-semibold hover:opacity-90">
          Dashboard
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 pt-12 pb-28 md:pb-36">
      <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
        <div className="md:col-span-7">
          <h1 className="font-sans font-extrabold text-ink tracking-[-0.03em] leading-[0.95]"
              style={{ fontSize: 'clamp(3rem, 7vw, 6.5rem)' }}>
            Four ways to get paid.
            <br />
            <span className="font-display italic font-medium text-accent" style={{ fontOpticalSizing: 'auto' }}>
              One URL.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-ink/70 mt-6 max-w-[52ch] leading-relaxed">
            The Stripe of USDC on Arc. 2% fee, 0.5s settlement, native USDC gas — for humans and AI agents. Sign in with email or wallet.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 items-center">
            <Link href="/build" className="px-6 py-3 rounded-full bg-ink text-paper font-semibold hover:opacity-90">
              Start building
            </Link>
            <Link href="/dashboard" className="px-6 py-3 rounded-full border border-ink font-semibold hover:bg-ink hover:text-paper transition">
              Claim your handle
            </Link>
          </div>
          <div className="mt-5">
            <CopyLine text="npm create arc-app" />
          </div>
        </div>
        <div className="md:col-span-5">
          <Convergence />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:3000/`. Check: no console errors, Hero renders with headline + convergence + CTAs, copy-line works, italic `One URL.` in Fraunces, forest green accent color visible.

- [ ] **Step 3: Commit**

```bash
cd landing
git add app/page.tsx
git commit -m "feat(landing): Nav + Hero section (convergence + italic display H1)"
```

---

### Task B9: Add HowItWorks section to page.tsx

**Files:**
- Modify: `landing/app/page.tsx` (append HowItWorks function + reference in Page)

Spec ref: §4.2.

- [ ] **Step 1: Add HowItWorks function after Hero**

```tsx
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Claim your handle', copy: 'Sign in with email or wallet, pick a handle, get arcpay.finance/@you.', artifact: 'GET /@you → 200 OK' },
    { n: '02', title: 'Choose what you sell', copy: 'Flip switches for tips, subs, paywalled content, or pay-per-call API.', artifact: 'POST /plans → plan_01j…' },
    { n: '03', title: 'Share the URL', copy: 'Paste your URL anywhere. Tips, subs, purchases, API calls all land on-chain.', artifact: '→ tx 0x8f3a… confirmed 0.4s' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <h2 className="font-display text-4xl md:text-5xl font-semibold mb-16 max-w-xl">How it works.</h2>
      <div className="space-y-16">
        {steps.map(s => (
          <div key={s.n} className="grid md:grid-cols-12 gap-6 md:gap-10 items-start">
            <div className="md:col-span-2">
              <div className="font-display text-accent leading-none" style={{ fontSize: '120px', fontOpticalSizing: 'auto', fontWeight: 300 }}>
                {s.n}
              </div>
            </div>
            <div className="md:col-span-6">
              <h3 className="font-display text-2xl md:text-3xl font-semibold">{s.title}</h3>
              <p className="text-ink/70 text-xl mt-3 leading-relaxed max-w-[42ch]">{s.copy}</p>
            </div>
            <div className="md:col-span-4">
              <code className="font-mono text-sm text-ink/60 block">{s.artifact}</code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Reference in Page()**

Edit the `<Page>` return to include `<HowItWorks />` after `<Hero />`.

- [ ] **Step 3: Browser check**

Reload `/`. Verify 3 rows with big `01/02/03` numbers on left, copy middle, mono artifacts right. Numbers should render in Fraunces, forest green.

- [ ] **Step 4: Commit**

```bash
cd landing
git add app/page.tsx
git commit -m "feat(landing): HowItWorks section (3-step editorial)"
```

---

### Task B10: Add FourModes tabbed section to page.tsx

**Files:**
- Modify: `landing/app/page.tsx` (add FourModes component + page reference)

Spec ref: §4.3.

- [ ] **Step 1: Add FourModes**

```tsx
'use client';
// NOTE: FourModes uses client state; see implementation below. Put this
// component in its own file if you prefer; inline is fine at current size.

function FourModes() {
  const [active, setActive] = useState(0);
  const modes = [
    {
      tab: 'Tips', kicker: 'ONE-TIME USDC',
      headline: 'Send a tip with a message.',
      copy: 'Every tweet, article, or profile becomes a tip target. Recipient claims via email or wallet. Unclaimed tips stay on-chain under the handle.',
      href: '/gavin', cta: 'See a creator page',
      code: `import { ArcPayClient } from '@wanggang22/arcpay-sdk';\nconst client = new ArcPayClient({ network: 'arc' });\nawait client.tips.send({\n  username: 'gavin',\n  amount: '0.005',\n  message: 'great post!',\n});`,
    },
    {
      tab: 'Subscriptions', kicker: 'MONTHLY USDC',
      headline: 'Recurring income in one tx.',
      copy: 'Monthly or yearly plans with per-second accrual. Cancel refunds the unused portion on-chain. 2% protocol fee.',
      href: '/demo-blog', cta: 'See the demo blog',
      code: `await client.subs.subscribe(planId, 3); // 3 months\n// paid-until now unlocks the paywall\nconst active = await client.subs.isActive(user, planId);`,
    },
    {
      tab: 'Content paywall', kicker: 'PAY ONCE, OWN FOREVER',
      headline: 'Gate articles, videos, files.',
      copy: 'Buyer pays once in USDC, access is an on-chain receipt. Works across devices. Works forever.',
      href: '/demo-product', cta: 'See the store demo',
      code: `await client.paywall.purchase(contentId, price);\n// Anywhere, anytime:\nconst owned = await client.paywall.checkAccess(contentId, wallet);`,
    },
    {
      tab: 'Pay-per-call', kicker: 'FOR AI AGENTS',
      headline: 'Prepay N API calls in one tx.',
      copy: 'batchPay prepays N credits up-front. SDK auto-signs each call. Server verifies on-chain. Perfect for agents billing per inference.',
      href: '/demo-agent', cta: 'Watch an agent pay',
      code: `// Prepay 100 call credits\nawait client.api.batchPay('gavin', 'summarize-paper', 100);\n// Each call signed automatically\nconst out = await client.api.call('gavin', 'summarize-paper', input);`,
    },
  ];
  const m = modes[active];
  return (
    <section id="modes" className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="flex flex-wrap gap-4 md:gap-6 mb-12 text-sm">
        {modes.map((mode, i) => (
          <button key={mode.tab} onClick={() => setActive(i)}
            className={`font-mono transition ${i === active ? 'text-accent border-b-2 border-accent pb-1' : 'text-ink/50 hover:text-ink/80'}`}>
            {mode.tab}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-7">
          <div className="font-mono text-xs text-accent tracking-wider mb-3">{m.kicker}</div>
          <h3 className="font-display text-3xl md:text-5xl font-semibold leading-tight">{m.headline}</h3>
          <p className="text-ink/70 text-lg mt-5 max-w-[50ch] leading-relaxed">{m.copy}</p>
          <Link href={m.href} className="inline-block mt-6 font-semibold text-accent hover:underline underline-offset-4">
            {m.cta} →
          </Link>
        </div>
        <div className="md:col-span-5">
          <CodeTabs tabs={[{ label: m.tab, code: m.code }]} />
        </div>
      </div>
    </section>
  );
}
```

Note: because this uses `useState`, either put it above a `'use client'` boundary or extract it into its own file `components/FourModes.tsx`. Recommended: extract. Then inside `page.tsx` just `import { FourModes } from '@/components/FourModes'` (the directive at the top of the file makes it a Client Component).

- [ ] **Step 2: Extract to components/FourModes.tsx**

Create `landing/components/FourModes.tsx`, put the `'use client'` directive on line 1, move the component body there, and import the needed deps (`useState`, `Link`, `CodeTabs`).

- [ ] **Step 3: Reference in Page()**

Add `<FourModes />` after `<HowItWorks />`. Import at top: `import { FourModes } from '@/components/FourModes'`.

- [ ] **Step 4: Browser check**

Reload `/`. Click through all 4 tabs. Verify: tab underline moves, right-side code block updates, `batchPay` code shows real signature.

- [ ] **Step 5: Commit**

```bash
cd landing
git add app/page.tsx components/FourModes.tsx
git commit -m "feat(landing): FourModes tabbed explorer (replaces Features + LiveDemos)"
```

---

### Task B11: Add ForDevelopers section

**Files:**
- Modify: `landing/app/page.tsx` (add ForDevelopers function + reference)
- Potentially create: `landing/components/ForDevelopers.tsx` if it uses client state (it will, via CodeTabs)

Spec ref: §4.4.

- [ ] **Step 1: Create components/ForDevelopers.tsx**

```tsx
'use client';
import { CodeTabs } from './CodeTabs';

export function ForDevelopers() {
  const tabs = [
    {
      label: 'JS / TypeScript',
      code: `pnpm add @wanggang22/arcpay-sdk
---
import { ArcPayClient } from '@wanggang22/arcpay-sdk';
const client = new ArcPayClient({ network: 'arc' });

// AI agent prepays 100 inference credits in one tx
await client.api.batchPay('gavin', 'summarize-paper', 100);

// Each subsequent call is signed off-chain, verified on-chain
const res = await client.api.call('gavin', 'summarize-paper', input);`,
    },
    {
      label: 'Python',
      code: `pip install arcpay
---
from arcpay import ArcPayClient
client = ArcPayClient(network='arc')

client.tips.send(username='gavin', amount='0.01', message='great post')`,
    },
    {
      label: 'x402 curl',
      code: `# Real endpoint: landing/app/api/demo-translate/route.ts
curl -X POST https://arcpay.finance/api/demo-translate \\
  -H "Content-Type: application/json" \\
  -d '{"callId":"12","signature":"0xa3f1…","text":"Hola","endpointId":"0x8f3a…"}'
---
→ 200 OK
{
  "ok": true,
  "message": "x402 verified · credit consumed",
  "translation": "Hello",
  "callId": "12"
}`,
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="max-w-xl mb-12">
        <div className="font-mono text-xs text-accent tracking-wider mb-3">FOR DEVELOPERS</div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
          One SDK. Every mode. Real code.
        </h2>
      </div>
      <CodeTabs tabs={tabs} />
      <div className="flex flex-wrap gap-3 mt-8 font-mono text-xs text-ink/60">
        <span className="px-3 py-1.5 rounded-md border border-hairline">create-arc-app v0.1.0</span>
        <span className="px-3 py-1.5 rounded-md border border-hairline">@wanggang22/arcpay-sdk v0.1.1</span>
        <span className="px-3 py-1.5 rounded-md border border-hairline">python arcpay 0.1.0</span>
        <a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-md border border-hairline hover:bg-ink/5">github.com/wanggang22/arcpay</a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Reference in Page**

Add `<ForDevelopers />` after `<FourModes />`. Import at top.

- [ ] **Step 3: Commit**

```bash
cd landing
git add app/page.tsx components/ForDevelopers.tsx
git commit -m "feat(landing): ForDevelopers section (3-tab real SDK code)"
```

---

### Task B12: Rewrite ChromeExtension section

**Files:**
- Modify: `landing/app/page.tsx` (add ChromeExtension function)

Spec ref: §4.5.

- [ ] **Step 1: Add ChromeExtension function**

```tsx
function ChromeExtension() {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-6">
          <div className="font-mono text-xs text-accent tracking-wider mb-3">CHROME EXTENSION</div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
            Tip any X user, right from the timeline.
          </h2>
          <p className="text-ink/70 text-lg mt-5 max-w-[50ch] leading-relaxed">
            Every tweet gets a ⚡ Tip button. Click it — sign in — send USDC. Recipient claims later via X OAuth even if they haven&apos;t joined yet. Tips are held on-chain keyed by the handle.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href="https://github.com/wanggang22/arcpay/releases" target="_blank" rel="noopener noreferrer"
               className="px-5 py-2.5 rounded-full bg-ink text-paper text-sm font-semibold hover:opacity-90">
              Download v0.2.0
            </a>
            <Link href="/claim" className="px-5 py-2.5 rounded-full border border-ink text-sm font-semibold hover:bg-ink hover:text-paper transition">
              Claim pending tips
            </Link>
          </div>
          <div className="mt-4 text-xs text-ink/50 font-mono">Load unpacked in Chrome / Edge / Brave. MV3 manifest.</div>
        </div>

        <div className="md:col-span-6">
          <div className="rounded-2xl border border-hairline bg-white overflow-hidden">
            <div className="p-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ink" />
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#0f1419' }}>Gavin <span className="text-xs font-normal" style={{ color: '#536471' }}>@gavin</span></div>
                  <div className="text-[11px]" style={{ color: '#536471' }}>2h · mock tweet</div>
                </div>
              </div>
              <div className="mt-3 text-sm" style={{ color: '#0f1419' }}>
                Just shipped ArcPay — 4 USDC payment modes on Arc. Tips, subs, paywalls, pay-per-call for AI agents. Chrome extension adds ⚡ right here.
              </div>
              <div className="mt-4 flex items-center gap-6 text-xs" style={{ color: '#536471' }}>
                <span>💬 24</span>
                <span>🔁 80</span>
                <span>❤ 412</span>
                <span className="ml-auto px-3 py-1 rounded-full border border-accent text-accent font-semibold text-[11px]">
                  ⚡ Tip
                </span>
              </div>
            </div>
            <div className="px-5 py-3 text-[11px] font-mono text-ink/50 bg-ink/[0.02]">
              ↑ injected by extension · clicks open arcpay.finance/@gavin
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Reference in Page + browser check**

Add `<ChromeExtension />`. Verify mock tweet has X-native colors (not accent2/pink), tip chip is forest-green outline.

- [ ] **Step 3: Commit**

```bash
cd landing
git add app/page.tsx
git commit -m "feat(landing): ChromeExtension section (X-native mock, forest-green tip chip)"
```

---

### Task B13: Add ForAgents section (NEW)

**Files:**
- Modify: `landing/app/page.tsx` (add ForAgents function)

Spec ref: §4.6.

- [ ] **Step 1: Add ForAgents function**

```tsx
function ForAgents() {
  const terminal = `$ curl -X POST https://arcpay.finance/api/demo-translate \\
  -H "Content-Type: application/json" \\
  -d '{"callId":"12","signature":"0xa3f1…","text":"Hola","endpointId":"0x8f3a…"}'

→ 200 OK
{
  "ok": true,
  "message": "x402 verified · credit consumed",
  "translation": "Hello",
  "callId": "12"
}`;
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-6">
          <div className="font-mono text-xs text-accent tracking-wider mb-3">FOR AGENTS</div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
            Autonomous payments, down to the inference call.
          </h2>
          <p className="text-ink/70 text-lg mt-5 max-w-[50ch] leading-relaxed">
            x402-compatible metered billing. <code className="font-mono text-ink">batchPay</code> prepays N credits in one on-chain tx. The SDK signs each request off-chain. Servers verify callId on-chain before serving. No human-in-loop required.
          </p>
          <Link href="/build#agents" className="inline-block mt-6 font-semibold text-accent hover:underline underline-offset-4">
            Read the agent spec →
          </Link>
        </div>
        <div className="md:col-span-6">
          <pre className="rounded-2xl border border-hairline bg-ink text-paper font-mono text-xs md:text-sm p-5 md:p-6 overflow-x-auto leading-relaxed">
            <code>{terminal}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Reference + browser check + commit**

```bash
cd landing
git add app/page.tsx
git commit -m "feat(landing): ForAgents section (real demo-translate curl)"
```

---

### Task B14: Rewrite Comparison section

**Files:**
- Modify: `landing/app/page.tsx` (add Comparison function)

Spec ref: §4.7.

- [ ] **Step 1: Add Comparison**

```tsx
function Comparison() {
  const rows: [string, string, string, string, string, string][] = [
    ['Fee', '2%', '2.9% + $0.30', '8–12%', '3.5% + $0.49', 'gas only'],
    ['Settlement', '0.5s', '2–7 days', 'monthly', '3–5 days', '2–12s'],
    ['Countries', 'global', '50', '60', '200', 'global'],
    ['Currency', 'USDC', 'USD', 'USD/EUR', 'USD/EUR', 'any ERC-20'],
    ['Setup', 'email', 'KYC + docs', 'Stripe req.', 'bank acct', 'self-deploy'],
    ['AI-agent', '✓', '—', '—', '—', 'DIY'],
    ['Open source', '✓', '—', '—', '—', '✓'],
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <h2 className="font-display text-4xl md:text-5xl font-semibold mb-12 max-w-xl">Why ArcPay.</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-hairline text-sm">
              <th className="py-3 pr-6 font-normal text-ink/50"></th>
              <th className="py-3 pr-6 font-semibold text-ink border-l-2 border-accent pl-4">ArcPay</th>
              <th className="py-3 pr-6 font-normal text-ink/60">Stripe</th>
              <th className="py-3 pr-6 font-normal text-ink/60">Patreon</th>
              <th className="py-3 pr-6 font-normal text-ink/60">PayPal</th>
              <th className="py-3 pr-6 font-normal text-ink/60">Custom contract</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm">
            {rows.map(r => (
              <tr key={r[0]} className="border-b border-hairline">
                <td className="py-4 pr-6 text-ink/60 font-sans">{r[0]}</td>
                <td className="py-4 pr-6 font-semibold text-ink border-l-2 border-accent/50 pl-4">{r[1]}</td>
                <td className="py-4 pr-6 text-ink/60">{r[2]}</td>
                <td className="py-4 pr-6 text-ink/60">{r[3]}</td>
                <td className="py-4 pr-6 text-ink/60">{r[4]}</td>
                <td className="py-4 pr-6 text-ink/60">{r[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Reference + browser check + commit**

```bash
cd landing
git add app/page.tsx
git commit -m "feat(landing): Comparison typographic table (no card bg)"
```

---

### Task B15: Add GetStarted + Footer sections

**Files:**
- Modify: `landing/app/page.tsx`

Spec refs: §4.8, §4.9.

- [ ] **Step 1: Add GetStarted + Footer**

```tsx
function GetStarted() {
  return (
    <section className="max-w-3xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline text-center">
      <h2 className="font-display text-4xl md:text-6xl font-semibold leading-tight">Start shipping.</h2>
      <div className="mt-8 inline-flex">
        <CopyLine text="npm create arc-app@latest" />
      </div>
      <div className="mt-6 flex flex-wrap gap-6 justify-center text-sm font-semibold">
        <Link href="/faucet" className="text-accent hover:underline underline-offset-4">Get testnet USDC →</Link>
        <Link href="/build" className="text-accent hover:underline underline-offset-4">Read the docs →</Link>
      </div>
      <div className="mt-10 text-xs text-ink/50 font-mono">MIT · no KYC · self-custodial</div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-6 md:px-10 py-12 border-t border-hairline grid md:grid-cols-4 gap-8 text-sm">
      <div>
        <div className="flex items-center gap-2 font-bold"><span className="text-accent">⚡</span> ArcPay</div>
        <div className="mt-3 text-ink/60 text-xs">© 2026 — MIT license</div>
        <div className="mt-1 text-ink/60 text-xs">
          Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">Arc Network</a>
        </div>
      </div>
      <div>
        <div className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">Product</div>
        <div className="space-y-2 text-ink/70">
          <div><Link href="/#modes" className="hover:text-ink">Modes</Link></div>
          <div><Link href="/dashboard" className="hover:text-ink">Dashboard</Link></div>
          <div><Link href="/faucet" className="hover:text-ink">Faucet</Link></div>
          <div><Link href="/claim" className="hover:text-ink">Claim tips</Link></div>
        </div>
      </div>
      <div>
        <div className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">Developers</div>
        <div className="space-y-2 text-ink/70">
          <div><Link href="/build" className="hover:text-ink">Docs</Link></div>
          <div><a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a></div>
          <div><a href="https://github.com/wanggang22/arcpay/releases" target="_blank" rel="noopener noreferrer" className="hover:text-ink">Chrome extension</a></div>
          <div><a href="https://www.npmjs.com/package/@wanggang22/arcpay-sdk" target="_blank" rel="noopener noreferrer" className="hover:text-ink">npm</a></div>
        </div>
      </div>
      <div>
        <div className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">Company</div>
        <div className="space-y-2 text-ink/70">
          <div><Link href="/privacy" className="hover:text-ink">Privacy</Link></div>
          <div><Link href="/blog" className="hover:text-ink">Blog</Link></div>
          <div><a href="https://x.com/arcpay" target="_blank" rel="noopener noreferrer" className="hover:text-ink">X</a></div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Wire full page order in Page()**

Update `export default function Page()` to include all sections in order:

```tsx
<div className="bg-paper text-ink">
  <Nav />
  <Hero />
  <HowItWorks />
  <FourModes />
  <ForDevelopers />
  <ChromeExtension />
  <ForAgents />
  <Comparison />
  <GetStarted />
  <Footer />
</div>
```

- [ ] **Step 3: Browser check — full page scroll**

Reload `/`. Scroll through top to bottom. Verify no broken sections, consistent spacing (`py-28 md:py-36`), hairline borders between sections, no color bleed from deprecated tokens.

- [ ] **Step 4: Commit**

```bash
cd landing
git add app/page.tsx
git commit -m "feat(landing): GetStarted + Footer + full section wire-up"
```

---

### Task B16: Apply copy direction rules + remove slop phrases

**Files:**
- Modify: `landing/app/page.tsx` (any remaining banned phrases)

Spec ref: §5.

- [ ] **Step 1: Grep for banned phrases**

Run: `cd landing && grep -inE "seamlessly|just shipped|game-changer|programmable like|play with it" app/page.tsx components/*.tsx`
Expected: zero matches. If any hit, rewrite the sentence so it's concrete (a number, an API name, or a verb).

- [ ] **Step 2: Grep for emoji in H1/H2/H3**

Run: `grep -E "<h[1-3][^>]*>[^<]*[💸📅🔒⚡📝🛒🤖🐦✍️🎨🎙️💼🎮]" landing/app/page.tsx landing/components/*.tsx`
Expected: zero matches. Exception: the ⚡ glyph in `<Nav>` / `<Footer>` is in a `<span>`, not an H tag — that's allowed.

- [ ] **Step 3: Commit if any fixes made**

```bash
cd landing
git add app/page.tsx components/*.tsx 2>/dev/null
git commit -m "chore(landing): final copy pass (remove slop, no emoji in Hn)" || echo "nothing to commit"
```

---

## Phase C — QA gate (spec §13)

### Task C1: Three-viewport screenshots

**Files:** none modified; produces PR artifacts.

- [ ] **Step 1: Start prod build locally**

```bash
cd landing
npm run build && npm run start
```
Expected: server starts on port 3000.

- [ ] **Step 2: Capture screenshots via chrome-devtools MCP**

Use `mcp__chrome-devtools__new_page` + `resize_page` + `take_screenshot` at three viewports:
- 1440×900 (desktop)
- 1024×768 (small desktop / iPad landscape)
- 375×812 (iPhone)

Save as `landing/qa/2026-04-21/desktop.png`, `tablet.png`, `mobile.png`.

- [ ] **Step 3: Visual pass**

Confirm no horizontal scrollbars at any viewport, Hero readable on mobile, FourModes tab bar wraps or scrolls cleanly.

---

### Task C2: Side-by-side vs live arcpay.finance

**Files:** none modified.

- [ ] **Step 1: Open live site at same 3 viewports**

Navigate chrome-devtools to `https://arcpay.finance/` at each viewport, capture `landing/qa/2026-04-21/live-desktop.png` etc.

- [ ] **Step 2: Diff**

Visually confirm the new local build is strictly better on the axes of: typography distinctiveness, palette warmth, absence of gradient clip-text, absence of pastel card backgrounds.

---

### Task C3: Console cleanliness

- [ ] **Step 1: Use `list_console_messages` MCP tool**

With `/` open on the local build, call `mcp__chrome-devtools__list_console_messages`. Expected: 0 errors, 0 warnings (React 19 third-party warnings excluded).

If errors exist, fix them before merge.

---

### Task C4: Internal link check

- [ ] **Step 1: Extract all hrefs**

```bash
cd landing
grep -oE 'href="[^"]*"' app/page.tsx components/*.tsx | sort -u > /tmp/hrefs.txt
cat /tmp/hrefs.txt
```

- [ ] **Step 2: HTTP check each internal link**

For each internal href (starting with `/`), verify the route exists locally by visiting it in the browser or:

```bash
for url in $(grep -oE 'href="/[^"]*"' landing/app/page.tsx | cut -d'"' -f2 | sort -u); do
  code=$(curl -o /dev/null -s -w "%{http_code}" "http://localhost:3000$url")
  echo "$code $url"
done
```

Expected: every `/` URL returns 200 (some may be 308 redirect; those are OK if the final destination is 200). External URLs are skipped.

---

### Task C5: Sub-page cascade smoke test

- [ ] **Step 1: Open 5 sub-pages in the browser**

Navigate to:
- `http://localhost:3000/build`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/demo-blog`
- `http://localhost:3000/demo-product`
- `http://localhost:3000/demo-agent`

For each, screenshot and visually assess. Accept layouts that look visually different from the new landing (different palette is expected since tokens migrated), but REJECT layouts that are outright broken (missing images, layout collapse, console errors, unreadable text).

- [ ] **Step 2: If any sub-page is broken, decide inline fix vs follow-up spec**

If a sub-page is unrecoverable without Phase-B-scope changes, STOP, escalate to CEO, and include the broken sub-page repro in the PR description — do not merge.

---

### Task C6: Lighthouse mobile score

- [ ] **Step 1: Run Lighthouse via chrome-devtools MCP**

`mcp__chrome-devtools__lighthouse_audit` at `http://localhost:3000/` with mobile emulation.

Expected: Performance ≥ 90, Best Practices ≥ 90.

- [ ] **Step 2: If score < 90, list and fix the top 3 opportunities**

Typical culprits: unoptimized SVG, missing `next/image` for demo screenshots, render-blocking Google Fonts CSS. Apply fixes before merge.

---

### Task C7: SDK signature audit grep

- [ ] **Step 1: Grep all client.* calls in landing**

```bash
cd landing
grep -oE "client\.[a-zA-Z.]+\(" app/page.tsx components/*.tsx | sort -u
```

- [ ] **Step 2: Cross-check every match against published SDK**

```bash
grep -oE "^\s*async [a-zA-Z]+" ../sdk/js/src/client.ts
```

Every `client.X.method` form in landing must correspond to a real `async method` in one of the sub-clients. Specifically confirm: `client.api.batchPay` resolves to `PayPerCallClient.batchPay` which was added in Phase A.

- [ ] **Step 3: Verify npm-pinned version actually has batchPay**

```bash
cd landing
grep -E "batchPay" node_modules/@wanggang22/arcpay-sdk/dist/index.js
```

Expected: at least one match. If zero, Phase A publish did not propagate — FAIL the QA gate and re-publish.

---

## Phase D — Ship

### Task D1: Deploy to Vercel production

**Files:** none modified in repo; deploys current branch via `vercel` CLI.

- [ ] **Step 1: Pre-deploy dry-run**

Run: `cd landing && vercel build`
Expected: `.vercel/output/` produced without errors.

- [ ] **Step 2: Create PR and wait for preview**

```bash
cd C:/Users/ASUS/arc/arcpay
gh pr create --title "Landing redesign — Vercel skeleton + Resend voice + 4-path convergence" --body "$(cat landing/specs/2026-04-21-landing-redesign.md | head -40)"
```

Vercel auto-deploys preview. Open the preview URL; repeat C1–C4 on preview.

- [ ] **Step 3: Merge and promote to production**

If preview QA passes, merge the PR. Vercel promotes to production on main.

- [ ] **Step 4: Live verification**

Visit `https://arcpay.finance/` post-deploy. Confirm the live redesign matches local prod build. If live diverges from preview, rollback via Vercel dashboard and investigate before declaring done.

- [ ] **Step 5: Announce**

Tweet from `@arcpay` account: "New landing: one URL, four ways to get paid. Redesigned from the ground up — Fraunces + Geist, warm ivory, deep forest green. arcpay.finance". Optional.

---

## Post-ship

- [ ] **Update spec's §11 follow-up list**: mark sub-page visual pass and OG image refresh as next queued items. Open issues in GitHub for each.
- [ ] **Release notes**: append "Landing redesign (v2026-04-21)" to `CHANGELOG.md` or equivalent.
- [ ] **Remove deprecated tokens**: when all sub-pages absorb the new palette (follow-up spec), delete `accent2` and `arc-gradient` from `tailwind.config.ts`.
