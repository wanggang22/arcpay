'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function BuildPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <BuildHeader />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Hero />
        <TOC />

        <Section id="quickstart" title="⚡ Quickstart" kicker="5 minutes to your first USDC payment">
          <Quickstart />
        </Section>

        <Section id="tip" title="💸 Tips" kicker="Fire-and-forget one-time payments — BuyMeACoffee replacement">
          <TipsDocs />
        </Section>

        <Section id="subscribe" title="📅 Subscriptions" kicker="Monthly / yearly billing — Patreon replacement">
          <SubscribeDocs />
        </Section>

        <Section id="content" title="🔒 Content paywall" kicker="Gate articles / PDFs / courses with one-time USDC">
          <ContentDocs />
        </Section>

        <Section id="api" title="⚡ Pay-per-call API" kicker="AI agents buy API credits in one tx — x402-compatible">
          <ApiDocs />
        </Section>

        <Section id="handle" title="🐦 Tip-by-handle (Chrome extension)" kicker="Tip any X user who hasn't even joined yet">
          <HandleDocs />
        </Section>

        <Section id="embed" title="🧩 Embed widgets" kicker="Drop ArcPay into any blog, Notion, README, Substack">
          <EmbedDocs />
        </Section>

        <Section id="contracts" title="📜 Contracts & chain info" kicker="Addresses, ABIs, RPC endpoints">
          <Contracts />
        </Section>

        <Section id="resources" title="📦 Resources" kicker="Source, docs, demos, support">
          <Resources />
        </Section>
      </main>
      <footer className="border-t border-gray-200 mt-16 py-10">
        <div className="max-w-5xl mx-auto px-6 text-sm text-gray-500 text-center">
          Built on Arc Network · USDC native · <Link href="/" className="underline hover:text-indigo-600">ArcPay</Link>
        </div>
      </footer>
    </div>
  );
}

function BuildHeader() {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-20 backdrop-blur bg-white/90">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-arc-gradient" />
          <span className="font-bold">ArcPay</span>
          <span className="text-xs text-gray-400 ml-1">/ build</span>
        </Link>
        <nav className="flex items-center gap-3 text-xs">
          <Link href="/demo-blog" className="text-gray-600 hover:text-indigo-600">📝 Blog demo</Link>
          <Link href="/demo-product" className="text-gray-600 hover:text-indigo-600">🛒 Product demo</Link>
          <Link href="/demo-agent" className="text-gray-600 hover:text-indigo-600">🤖 Agent demo</Link>
          <Link href="/faucet" className="text-gray-600 hover:text-indigo-600">💧 Faucet</Link>
          <a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-indigo-600">GitHub</a>
          <Link href="/gavin"
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-700">
            Try the app
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <div className="text-center py-16">
      <div className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-5">
        For developers
      </div>
      <h1 className="text-5xl font-extrabold tracking-tight">Build on ArcPay</h1>
      <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
        USDC payments primitive for creators, apps, and AI agents. Four payment modes. Zero database. The chain is your subscriber list, your paywall, your invoice.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <a href="#quickstart"
          className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700">
          Get started →
        </a>
        <a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold hover:border-gray-300">
          View on GitHub
        </a>
      </div>
    </div>
  );
}

function TOC() {
  const items = [
    ['quickstart', '⚡ Quickstart'],
    ['tip', '💸 Tips'],
    ['subscribe', '📅 Subscriptions'],
    ['content', '🔒 Content paywall'],
    ['api', '⚡ Pay-per-call API'],
    ['handle', '🐦 Tip-by-handle'],
    ['embed', '🧩 Embed widgets'],
    ['contracts', '📜 Contracts'],
    ['resources', '📦 Resources'],
  ];
  return (
    <div className="my-10 p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-pink-50 border border-gray-200">
      <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Contents</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {items.map(([id, label]) => (
          <a key={id} href={`#${id}`}
            className="text-sm text-gray-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-white transition">
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 scroll-mt-20">
      <h2 className="text-3xl font-extrabold">{title}</h2>
      {kicker && <p className="mt-1 text-gray-500 text-sm">{kicker}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Quickstart() {
  const install = `# Install from source (SDK lives in sdk/js/ of the monorepo)
git clone https://github.com/wanggang22/arcpay
cd arcpay/sdk/js && npm install && npm run build
# Reference as local file in your project:
npm install $(pwd)

# (A published @arcpay/sdk on npm is planned post-hackathon —
#  for now, the source build above is the canonical install path.)`;
  const connect = `import { ArcPayClient } from '@arcpay/sdk';

const client = new ArcPayClient({
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY!,
});`;
  const tip = `// Send a tip to any registered creator
await client.tips.send({
  username: 'gavin',
  amount: '0.005',     // USDC
  message: 'Love your work!',
});`;
  const check = `// Check if a wallet is an active subscriber to plan 0
const isActive = await client.subs.isActive(wallet, 0n);
if (isActive) renderPremiumContent();`;

  return (
    <div className="space-y-6">
      <Step num="1" title="Install the SDK">
        <CodeBlock lang="bash">{install}</CodeBlock>
      </Step>
      <Step num="2" title="Connect">
        <CodeBlock lang="ts">{connect}</CodeBlock>
        <p className="text-sm text-gray-600 mt-2">
          Get free testnet USDC at <a href="/faucet" className="underline text-indigo-600">arcpay.finance/faucet</a>.
        </p>
      </Step>
      <Step num="3" title="Send a payment">
        <CodeBlock lang="ts">{tip}</CodeBlock>
      </Step>
      <Step num="4" title="Read on-chain state (no database needed)">
        <CodeBlock lang="ts">{check}</CodeBlock>
        <p className="text-sm text-gray-600 mt-2">
          Every payment / subscription / unlock is queryable from the chain. No webhooks, no Stripe dashboard — the contract is the source of truth.
        </p>
      </Step>
    </div>
  );
}

function TipsDocs() {
  const sendCode = `// 1. Send a tip (signed by the fan's wallet)
await client.tips.send({
  username: 'gavin',
  amount: '0.005',
  message: 'Great thread!',
});`;
  const listCode = `// 2. List a creator's lifetime tips
const lifetime = await client.tips.getLifetimeReceived('gavin');
// → bigint in wei (18 decimals)

const tipIds = await client.tips.getByCreator('gavin');
// → bigint[] of tip receipts
for (const id of tipIds) {
  const tip = await client.tips.get(id);
  console.log(tip.from, tip.amount, tip.message, tip.timestamp);
}`;

  return (
    <>
      <p className="text-gray-700 leading-relaxed">
        Simplest mode. Fan sends USDC + optional message; creator claims via <code>withdraw(username)</code>. Protocol takes 2%.
      </p>
      <CodeBlock lang="ts" className="mt-4">{sendCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{listCode}</CodeBlock>
      <Scenarios
        items={[
          { title: 'Blog', body: 'Paste an ArcPay tip widget under each article (see Embed section).' },
          { title: 'Open-source README', body: 'Add a one-line Markdown badge: `![](arcpay.finance/badge/you.svg)`' },
          { title: 'Twitter / X', body: 'Install the Chrome extension — every tweet gets a 💸 Tip button.' },
        ]}
      />
    </>
  );
}

function SubscribeDocs() {
  const createCode = `// As a creator — one-time: create a plan
const planId = await client.subs.createPlan({
  username: 'gavin',
  name: 'Premium',
  pricePerMonth: '10',  // USDC
  metadataURI: '',
});
console.log('Plan id:', planId);`;

  const subscribeCode = `// As a fan — subscribe for N months in one tx
await client.subs.subscribe({
  planId: 0n,
  months: 3,           // pay-upfront for 3 months
});`;

  const gatingCode = `// 🔑 The magic: gate anything, anywhere, with one read
export async function isActiveSubscriber(
  wallet: \`0x\${string}\`,
  planId: bigint,
) {
  const slot = await readContract(client, {
    address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
    functionName: 'activeSubOf', args: [wallet, planId],
  });
  if (slot === 0n) return false;
  const sub = await readContract(client, {
    address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
    functionName: 'getSubscription', args: [slot - 1n],
  });
  return sub.active && Number(sub.paidUntil) * 1000 > Date.now();
}`;

  const nextjsExample = `// Next.js client-side gating
function Article() {
  const { address } = useAccount();
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (address) isActiveSubscriber(address, 0n).then(setPaid);
  }, [address]);
  return paid ? <FullArticle /> : <Paywall />;
}`;

  const discordExample = `// Discord bot — /verify command puts subscriber in premium role
bot.on('interactionCreate', async (i) => {
  if (i.commandName !== 'verify') return;
  const wallet = await lookupWallet(i.user.id); // discord id → wallet
  if (await isActiveSubscriber(wallet, 0n)) {
    await i.member.roles.add(PREMIUM_ROLE_ID);
    await i.reply('👑 Welcome to Premium!');
  } else {
    await i.reply(\`Subscribe: https://arcpay.finance/\${CREATOR}?tab=subscribe\`);
  }
});`;

  const expressExample = `// Express middleware — gate any API route
app.use('/api/premium/*', async (req, res, next) => {
  const wallet = req.header('X-Wallet') as \`0x\${string}\`;
  const sig    = req.header('X-Signature') as \`0x\${string}\`;
  const nonce  = req.header('X-Nonce')!;

  if (!await verifyMessage({ address: wallet, message: nonce, signature: sig })) {
    return res.status(401).end();   // bad signature
  }
  if (!await isActiveSubscriber(wallet, 0n)) {
    return res.status(402).end();   // not subscribed — HTTP 402!
  }
  next();
});`;

  return (
    <>
      <p className="text-gray-700 leading-relaxed">
        Plans are created on-chain by creators. Fans pay upfront for N months. The contract <strong>accrues revenue per-second</strong>: creators can only withdraw what has already flowed; unused time is refundable on cancellation.
      </p>
      <CodeBlock lang="ts" className="mt-4">{createCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{subscribeCode}</CodeBlock>

      <div className="mt-6 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
        <div className="text-xs font-bold uppercase tracking-wider text-yellow-700">⭐ Key primitive</div>
        <div className="text-sm text-yellow-900 mt-1">
          The <code>activeSubOf(wallet, planId)</code> + <code>getSubscription(slot-1)</code> pair gives you &quot;is this wallet subscribed right now?&quot; in two RPC calls. No database.
        </div>
      </div>

      <CodeBlock lang="ts" className="mt-4">{gatingCode}</CodeBlock>

      <h3 className="mt-8 font-bold text-lg">3 real integration scenarios</h3>
      <div className="mt-4 space-y-6">
        <Scenario title="A. Next.js blog / newsletter" code={nextjsExample} />
        <Scenario title="B. Discord bot (premium role on subscription)" code={discordExample} />
        <Scenario title="C. Express API middleware (HTTP 402 on unpaid)" code={expressExample} />
      </div>
      <p className="text-sm text-gray-500 mt-4">
        Live example: <Link href="/demo-blog" className="underline text-indigo-600">arcpay.finance/demo-blog</Link> (Substack-style paywall)
      </p>
    </>
  );
}

function ContentDocs() {
  const createCode = `// As creator — upload a content item
await client.paywall.createContent({
  username: 'gavin',
  title: 'Behind the scenes: 10 lessons from my first SaaS',
  priceWei: parseUnits('5', 18),   // 5 USDC
  metadataURI: 'data:application/json,' + encodeURIComponent(JSON.stringify({
    title: 'Behind the scenes',
    description: 'PDF + 15-min video',
    url: 'https://gated.content.example.com/abc',   // revealed after purchase
  })),
});
// → returns contentId (bytes32)`;

  const purchaseCode = `// As fan — buy access
await client.paywall.purchase(contentId, priceWei);`;

  const gatingCode = `// Anyone — check access for a wallet
const hasAccess = await client.paywall.checkAccess(contentId, wallet);
if (hasAccess) revealUrl();`;

  return (
    <>
      <p className="text-gray-700 leading-relaxed">
        One-time purchase unlocks one item. Works for PDFs, videos, prompts, reports. Metadata URI can be a data URL or IPFS. The secret URL is stored on-chain but only revealed in the UI after <code>checkAccess</code> returns true.
      </p>
      <CodeBlock lang="ts" className="mt-4">{createCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{purchaseCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{gatingCode}</CodeBlock>
      <Scenarios
        items={[
          { title: 'Gumroad replacement', body: 'Sell a PDF, send buyer a Google Drive link post-purchase.' },
          { title: 'Paid research', body: 'Upload a report; only those who paid see the download URL.' },
          { title: 'Course drip', body: 'Each lesson is a content item; unlock them one by one.' },
        ]}
      />
      <p className="text-sm text-gray-500 mt-4">
        Live example: <Link href="/demo-product" className="underline text-indigo-600">arcpay.finance/demo-product</Link> (Gumroad-style)
      </p>
    </>
  );
}

function ApiDocs() {
  const registerCode = `// As API provider — register an endpoint (one-time)
const endpointId = await client.api.registerEndpoint({
  username: 'gavin',
  name: 'summarize-paper',
  pricePerCallWei: parseUnits('0.001', 18),
});`;

  const batchPayCode = `// As client / AI agent — buy 100 call credits in one tx
await client.api.batchPay('gavin', 'summarize-paper', 100);
// → costs 100 * 0.001 = 0.1 USDC, emits 100 Paid events, allocates callIds`;

  const callCode = `// Per call — SDK auto-signs the HTTP request with your wallet
const result = await client.api.call('gavin', 'summarize-paper', {
  paper: '<text>',
});
// SDK handles: pick a fresh callId, sign (callId, endpoint, payer), attach
// headers X-Arcpay-CallId + X-Arcpay-Signature, POST to endpoint URL.`;

  const verifyCode = `// As API server — verify an incoming request
app.post('/summarize-paper', async (req, res) => {
  const callId = req.header('X-Arcpay-CallId');
  const sig    = req.header('X-Arcpay-Signature');
  if (!await arcpay.api.verifyCall({ callId, sig, endpointId })) {
    return res.status(402).send('Invalid or consumed call credit');
  }
  // ... run your model, return result
});`;

  return (
    <>
      <p className="text-gray-700 leading-relaxed">
        Pay-per-request API billing designed for AI agents. Agent prepays N call credits in one transaction, then authenticates each HTTP call by signing with the same wallet. The server verifies the signature matches the on-chain payer of an unused <code>callId</code>.
      </p>
      <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">⭐ x402 + ERC-8183 compliant</div>
        <div className="text-sm text-indigo-900 mt-1">
          HTTP 402 when unpaid. No API key management. Two AI agents can buy and sell services without any human-facing auth.
        </div>
      </div>
      <CodeBlock lang="ts" className="mt-4">{registerCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{batchPayCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{callCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{verifyCode}</CodeBlock>
      <Scenarios
        items={[
          { title: 'AI research agent', body: 'batchPay(1000) then run overnight; each model call settles on-chain.' },
          { title: 'Translation service', body: 'Prepay 10k calls for a Discord bot.' },
          { title: 'Agent-to-agent commerce', body: 'Agent A pays Agent B without either needing a Stripe account.' },
        ]}
      />
      <p className="text-sm text-gray-500 mt-4">
        Live example: <Link href="/demo-agent" className="underline text-indigo-600">arcpay.finance/demo-agent</Link> (x402 translation agent)
      </p>
    </>
  );
}

function HandleDocs() {
  const extTipCode = `// Chrome extension: tip any X user, even if they haven't joined ArcPay
// (button injected under every tweet)
// → popup opens arcpay.finance/quick-tip/{handle} → user signs → tx lands in
//   TipJarByHandle, held under handle hash until recipient claims.

// Direct contract call:
await client.writeContract({
  address: ADDRESSES.tipJarByHandle, abi: tipJarByHandleAbi,
  functionName: 'tipByHandle',
  args: ['elonmusk', 'First ArcPay tip on X'],
  value: parseUnits('0.01', 18),
});`;

  const claimFlow = `// Recipient claim flow (off-chain + on-chain)
// 1. Recipient visits arcpay.finance/claim, connects wallet
// 2. Clicks "Sign in with X", Twitter OAuth2 PKCE
// 3. Backend verifies handle ownership, signs EIP-191 attestation:
//    keccak256("ArcPayHandleClaim" || chainId || contract
//              || handle || recipient || deadline)
// 4. Recipient submits attestation on-chain:
await contract.claimByHandle(handle, recipient, deadline, signature);
// 5. Contract recovers signer from signature; if signer == backend key,
//    pays out pendingByHandle[keccak256(handle)] to recipient.`;

  return (
    <>
      <p className="text-gray-700 leading-relaxed">
        The hardest viral feature: tip an X handle that has no wallet yet. Tips accumulate in <code>TipJarByHandle</code>. Later, the handle owner logs in with Twitter OAuth; our backend signs a trustless attestation; the contract verifies and releases funds. We never hold funds — the attestation signer is a non-custodial key.
      </p>
      <CodeBlock lang="ts" className="mt-4">{extTipCode}</CodeBlock>
      <CodeBlock lang="ts" className="mt-4">{claimFlow}</CodeBlock>
      <p className="text-sm text-gray-500 mt-4">
        Install the extension from <a href="https://github.com/wanggang22/arcpay/releases" target="_blank" rel="noopener noreferrer" className="underline text-indigo-600">GitHub releases</a> to try it on x.com today.
      </p>
    </>
  );
}

function EmbedDocs() {
  const iframeTip = `<iframe
  src="https://arcpay.finance/embed/tip/gavin"
  width="420" height="320" style="border:0"></iframe>`;

  const iframeSub = `<iframe
  src="https://arcpay.finance/embed/subscribe/gavin"
  width="420" height="360" style="border:0"></iframe>`;

  const jsSdk = `<script src="https://arcpay.finance/embed.js" defer></script>
<div data-arcpay="tip" data-user="gavin"></div>
<button data-arcpay-button data-user="gavin">💸 Tip me</button>`;

  const badge = `[![Tip on ArcPay](https://arcpay.finance/badge/gavin.svg)](https://arcpay.finance/gavin)`;

  return (
    <>
      <p className="text-gray-700 leading-relaxed">
        Drop ArcPay into any blog, Notion, Substack, GitHub README, or landing page. All embeds are SSR-cached for fast loads and auto-enrich with the creator&apos;s X profile (avatar + bio).
      </p>
      <CodeBlock lang="html" title="Tip iframe" className="mt-4">{iframeTip}</CodeBlock>
      <CodeBlock lang="html" title="Subscribe iframe" className="mt-4">{iframeSub}</CodeBlock>
      <CodeBlock lang="html" title="JS SDK (inline + button modes)" className="mt-4">{jsSdk}</CodeBlock>
      <CodeBlock lang="markdown" title="GitHub README badge" className="mt-4">{badge}</CodeBlock>
      <p className="text-sm text-gray-500 mt-4">
        See them rendered live at{' '}
        <Link href="/demo-blog" className="underline text-indigo-600">arcpay.finance/demo-blog</Link>.
      </p>
    </>
  );
}

function Contracts() {
  const rows: Array<[string, string, string]> = [
    ['UsernameRegistry', '0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb', 'Username → creator mapping'],
    ['TipJar', '0x45daE58fB5b89C4E994216D2af0B73232641DF3B', 'Username-addressed tips'],
    ['TipJarByHandle', '0x291b86d46027f734cF43Eca9BA2394F46dcd529C', 'Handle-based pending tips + claim'],
    ['Subscriptions', '0xbb84078Aa19b9c5Eb397782dE9b58939C38d1380', 'Monthly/yearly plans with per-second accrual'],
    ['ContentPaywall', '0x680884124F21939548Ba7f982B4F275A55783484', 'One-time content unlocks'],
    ['PayPerCall', '0x3a399A310965A5cbD5a2B9F21a3B9885B6372def', 'API billing + batchPay for agents'],
    ['ArcPayHub', '0x79ab5a4B2770BF087aF2fF4CEdb0E67A413bf293', 'Registry of module addresses'],
  ];
  return (
    <>
      <div className="mb-4 text-sm text-gray-700">
        <strong>Network:</strong> Arc Testnet (chainId 5042002) ·{' '}
        <strong>RPC:</strong> <code>https://rpc.testnet.arc.network</code> ·{' '}
        <strong>Explorer:</strong> <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">testnet.arcscan.app</a>
      </div>
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-bold">Contract</th>
              <th className="text-left px-4 py-2 font-bold">Address</th>
              <th className="text-left px-4 py-2 font-bold hidden md:table-cell">What it does</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, addr, note]) => (
              <tr key={name} className="border-t border-gray-200">
                <td className="px-4 py-3 font-mono text-xs font-bold">{name}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  <a href={`https://testnet.arcscan.app/address/${addr}`} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline">{addr}</a>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Resources() {
  const links: Array<[string, string, string]> = [
    ['📦 Source code', 'https://github.com/wanggang22/arcpay', 'Contracts, SDK, landing, dashboard, extension — all MIT'],
    ['📝 Demo: Subscribe (Substack-style)', 'https://arcpay.finance/demo-blog', 'Paywalled blog with auto-unlock on subscription'],
    ['🛒 Demo: Content Paywall (Gumroad-style)', 'https://arcpay.finance/demo-product', 'Single-item sales page with on-chain receipt'],
    ['🤖 Demo: Pay-per-call AI Agent', 'https://arcpay.finance/demo-agent', 'x402 translation agent with on-chain signature verification'],
    ['💧 Faucet', 'https://arcpay.finance/faucet', 'Grab testnet USDC to start building'],
    ['🐦 Chrome extension', 'https://github.com/wanggang22/arcpay/releases', 'Load unpacked in Chrome/Edge/Brave — Tip on x.com'],
    ['🎁 Claim flow', 'https://arcpay.finance/claim', 'If someone tipped your X handle before you joined'],
    ['🏠 Creator Dashboard', 'https://app.arcpay.finance', 'Register username, manage plans/content/APIs, withdraw'],
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {links.map(([name, url, desc]) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
          className="block p-4 rounded-2xl border border-gray-200 hover:border-indigo-400 hover:shadow-sm transition">
          <div className="font-bold">{name}</div>
          <div className="text-xs text-gray-500 mt-1">{desc}</div>
          <div className="text-[10px] text-indigo-600 font-mono mt-1 truncate">{url}</div>
        </a>
      ))}
    </div>
  );
}

// ─── Building blocks ─────────────────────────────────────────

function Step({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold mb-2">{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function Scenario({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div className="font-bold text-sm mb-2">{title}</div>
      <CodeBlock lang="ts">{code}</CodeBlock>
    </div>
  );
}

function Scenarios({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <div className="mt-6 grid md:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.title} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="font-bold text-sm">{it.title}</div>
          <div className="text-xs text-gray-600 mt-1 leading-relaxed">{it.body}</div>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ children, lang, title, className }: {
  children: string;
  lang?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className={`relative group rounded-xl overflow-hidden border border-gray-800 bg-gray-950 ${className || ''}`}>
      {(lang || title) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
          <div className="text-[11px] font-mono text-gray-400">
            {title ? <span className="text-gray-300 font-bold mr-2">{title}</span> : null}
            {lang && <span className="uppercase tracking-wider">{lang}</span>}
          </div>
          <button
            onClick={copy}
            className="text-[11px] text-gray-400 hover:text-white font-medium px-2 py-0.5 rounded transition"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      )}
      {!(lang || title) && (
        <button
          onClick={copy}
          className="absolute top-2 right-2 text-[11px] text-gray-400 hover:text-white bg-gray-900/80 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
        >
          {copied ? '✓' : '📋'}
        </button>
      )}
      <pre className="p-4 text-xs text-gray-100 overflow-x-auto leading-relaxed font-mono">
        <code>{children}</code>
      </pre>
    </div>
  );
}
