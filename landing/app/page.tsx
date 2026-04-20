import Link from 'next/link';
import { Convergence } from '@/components/Convergence';
import { CopyLine } from '@/components/CopyLine';
import { FourModes } from '@/components/FourModes';
import { ForDevelopers } from '@/components/ForDevelopers';

export default function Page() {
  return (
    <div className="bg-paper text-ink overflow-x-hidden">
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
        <a
          href="https://github.com/wanggang22/arcpay"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent hidden sm:inline"
        >
          GitHub
        </a>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-full bg-ink text-paper text-sm font-semibold hover:opacity-90"
        >
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
          <h1
            className="font-sans font-extrabold text-ink tracking-[-0.03em] leading-[0.95]"
            style={{ fontSize: 'clamp(3rem, 7vw, 6.5rem)' }}
          >
            Four ways to get paid.
            <br />
            <span
              className="font-display italic font-medium text-accent"
              style={{ fontOpticalSizing: 'auto' }}
            >
              One URL.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-ink/70 mt-6 max-w-[52ch] leading-relaxed">
            The Stripe of USDC on Arc. 2% fee, 0.5s settlement, native USDC gas — for humans and AI agents. Sign in with email or wallet.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 items-center">
            <Link
              href="/build"
              className="px-6 py-3 rounded-full bg-ink text-paper font-semibold hover:opacity-90"
            >
              Start building
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full border border-ink font-semibold hover:bg-ink hover:text-paper transition"
            >
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

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Claim your handle',
      copy: 'Sign in with email or wallet, pick a handle, get arcpay.finance/@you.',
      artifact: 'GET /@you → 200 OK',
    },
    {
      n: '02',
      title: 'Choose what you sell',
      copy: 'Flip switches for tips, subs, paywalled content, or pay-per-call API.',
      artifact: 'POST /plans → plan_01j…',
    },
    {
      n: '03',
      title: 'Share the URL',
      copy: 'Paste your URL anywhere. Tips, subs, purchases, API calls all land on-chain.',
      artifact: '→ tx 0x8f3a… confirmed 0.4s',
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <h2 className="font-display text-4xl md:text-5xl font-semibold mb-16 max-w-xl">
        How it works.
      </h2>
      <div className="space-y-16">
        {steps.map((s) => (
          <div
            key={s.n}
            className="grid md:grid-cols-12 gap-6 md:gap-10 items-start"
          >
            <div className="md:col-span-2">
              <div
                className="font-display text-accent leading-none"
                style={{ fontSize: '120px', fontOpticalSizing: 'auto', fontWeight: 300 }}
              >
                {s.n}
              </div>
            </div>
            <div className="md:col-span-6">
              <h3 className="font-display text-2xl md:text-3xl font-semibold">
                {s.title}
              </h3>
              <p className="text-ink/70 text-xl mt-3 leading-relaxed max-w-[42ch]">
                {s.copy}
              </p>
            </div>
            <div className="md:col-span-4">
              <code className="font-mono text-sm text-ink/60 block">
                {s.artifact}
              </code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChromeExtension() {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-6">
          <div className="font-mono text-xs text-accent tracking-wider mb-3">
            CHROME EXTENSION
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
            Tip any X user, right from the timeline.
          </h2>
          <p className="text-ink/70 text-lg mt-5 max-w-[50ch] leading-relaxed">
            Every tweet gets a ⚡ Tip button. Click it — sign in — send USDC. Recipient claims later via X OAuth even if they haven&apos;t joined yet. Tips are held on-chain keyed by the handle.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href="https://github.com/wanggang22/arcpay/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full bg-ink text-paper text-sm font-semibold hover:opacity-90"
            >
              Download v0.2.1
            </a>
            <Link
              href="/claim"
              className="px-5 py-2.5 rounded-full border border-ink text-sm font-semibold hover:bg-ink hover:text-paper transition"
            >
              Claim pending tips
            </Link>
          </div>
          <div className="mt-4 text-xs text-ink/50 font-mono">
            Load unpacked in Chrome / Edge / Brave. MV3 manifest.
          </div>
        </div>

        <div className="md:col-span-6">
          <div className="rounded-2xl border border-hairline bg-white overflow-hidden shadow-sm">
            <div className="p-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ink" />
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#0f1419' }}>
                    Gavin{' '}
                    <span className="text-xs font-normal" style={{ color: '#536471' }}>
                      @gavin
                    </span>
                  </div>
                  <div className="text-[11px]" style={{ color: '#536471' }}>
                    2h · mock tweet
                  </div>
                </div>
              </div>
              <div className="mt-3 text-sm leading-relaxed" style={{ color: '#0f1419' }}>
                ArcPay is live — 4 USDC payment modes on Arc. Tips, subs, paywalls, pay-per-call for AI agents. The Chrome extension adds ⚡ right here.
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

function ForAgents() {
  const terminal = `$ curl -X POST https://arcpay.finance/api/demo-translate \\
    -H "Content-Type: application/json" \\
    -d '{"callId":"12","signature":"0xa3f1...","text":"Hola","endpointId":"0x8f3a..."}'

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
          <div className="font-mono text-xs text-accent tracking-wider mb-3">
            FOR AGENTS
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
            Autonomous payments, down to the inference call.
          </h2>
          <p className="text-ink/70 text-lg mt-5 max-w-[50ch] leading-relaxed">
            x402-compatible metered billing.{' '}
            <code className="font-mono text-ink">batchPay</code> prepays N credits in one on-chain tx. The SDK signs each request off-chain. Servers verify callId on-chain before serving. No human-in-loop required.
          </p>
          <Link
            href="/build#agents"
            className="inline-block mt-6 font-semibold text-accent hover:underline underline-offset-4"
          >
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
      <h2 className="font-display text-4xl md:text-5xl font-semibold mb-12 max-w-xl">
        Why ArcPay.
      </h2>
      <div className="overflow-x-auto max-w-full">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-hairline text-sm">
              <th className="py-3 pr-6 font-normal text-ink/50"></th>
              <th className="py-3 pr-6 font-semibold text-ink border-l-2 border-accent pl-4">
                ArcPay
              </th>
              <th className="py-3 pr-6 font-normal text-ink/60">Stripe</th>
              <th className="py-3 pr-6 font-normal text-ink/60">Patreon</th>
              <th className="py-3 pr-6 font-normal text-ink/60">PayPal</th>
              <th className="py-3 pr-6 font-normal text-ink/60">Custom contract</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm">
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-hairline">
                <td className="py-4 pr-6 text-ink/60 font-sans">{r[0]}</td>
                <td className="py-4 pr-6 font-semibold text-ink border-l-2 border-accent/50 pl-4">
                  {r[1]}
                </td>
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

function GetStarted() {
  return (
    <section className="max-w-3xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline text-center">
      <h2 className="font-display text-4xl md:text-6xl font-semibold leading-tight">
        Start shipping.
      </h2>
      <div className="mt-8 inline-flex">
        <CopyLine text="npm create arc-app@latest" />
      </div>
      <div className="mt-6 flex flex-wrap gap-6 justify-center text-sm font-semibold">
        <Link href="/faucet" className="text-accent hover:underline underline-offset-4">
          Get testnet USDC →
        </Link>
        <Link href="/build" className="text-accent hover:underline underline-offset-4">
          Read the docs →
        </Link>
      </div>
      <div className="mt-10 text-xs text-ink/50 font-mono">
        MIT · no KYC · self-custodial
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-6 md:px-10 py-12 border-t border-hairline grid md:grid-cols-4 gap-8 text-sm">
      <div>
        <div className="flex items-center gap-2 font-bold">
          <span className="text-accent">⚡</span> ArcPay
        </div>
        <div className="mt-3 text-ink/60 text-xs">© 2026 — MIT license</div>
        <div className="mt-1 text-ink/60 text-xs">
          Built on{' '}
          <a
            href="https://arc.network"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            Arc Network
          </a>
        </div>
      </div>
      <div>
        <div className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">
          Product
        </div>
        <div className="space-y-2 text-ink/70">
          <div><Link href="/#modes" className="hover:text-ink">Modes</Link></div>
          <div><Link href="/dashboard" className="hover:text-ink">Dashboard</Link></div>
          <div><Link href="/faucet" className="hover:text-ink">Faucet</Link></div>
          <div><Link href="/claim" className="hover:text-ink">Claim tips</Link></div>
        </div>
      </div>
      <div>
        <div className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">
          Developers
        </div>
        <div className="space-y-2 text-ink/70">
          <div><Link href="/build" className="hover:text-ink">Docs</Link></div>
          <div>
            <a
              href="https://github.com/wanggang22/arcpay"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              GitHub
            </a>
          </div>
          <div>
            <a
              href="https://github.com/wanggang22/arcpay/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              Chrome extension
            </a>
          </div>
          <div>
            <a
              href="https://www.npmjs.com/package/@wanggang22/arcpay-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              npm
            </a>
          </div>
        </div>
      </div>
      <div>
        <div className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">
          Company
        </div>
        <div className="space-y-2 text-ink/70">
          <div><Link href="/privacy" className="hover:text-ink">Privacy</Link></div>
          <div><Link href="/blog" className="hover:text-ink">Blog</Link></div>
          <div>
            <a
              href="https://x.com/arcpay"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              X
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
