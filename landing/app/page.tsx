import Link from 'next/link';

export default function Page() {
  return (
    <div className="bg-paper text-ink">
      <Hero />
      <Features />
      <LiveDemos />
      <ExtensionShowcase />
      <UseCases />
      <Code />
      <Comparison />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-16 md:pb-20">
      <header className="flex justify-between items-center mb-14 md:mb-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-arc-gradient" />
          <span className="font-bold text-xl">ArcPay</span>
        </Link>
        <nav className="flex items-center gap-4 md:gap-6 text-sm">
          <a href="#demos" className="hover:text-accent hidden sm:inline">Demos</a>
          <Link href="/build" className="hover:text-accent">Build</Link>
          <a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer" className="hover:text-accent hidden sm:inline">GitHub</a>
          <Link href="/dashboard" className="px-4 py-2 rounded-full bg-ink text-paper text-sm font-semibold hover:opacity-90">
            Dashboard
          </Link>
        </nav>
      </header>

      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
        USDC payments,<br />
        <span className="bg-arc-gradient bg-clip-text text-transparent">programmable like the internet.</span>
      </h1>
      <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-2xl">
        Tips, subscriptions, paywalls, and pay-per-call billing on Arc Network. 2% fee. No Stripe account. No separate gas token. Works with email or wallet — for humans and AI agents.
      </p>

      <div className="flex flex-wrap gap-3 mt-8">
        <Link href="/build" className="px-6 py-3 rounded-full bg-ink text-paper font-semibold hover:opacity-90">
          Start building →
        </Link>
        <Link href="/dashboard" className="px-6 py-3 rounded-full border-2 border-ink font-semibold hover:bg-ink hover:text-paper transition">
          Claim your username
        </Link>
        <a href="#demos" className="px-6 py-3 rounded-full text-ink font-semibold hover:text-accent transition underline-offset-4 hover:underline">
          Try the demos ↓
        </a>
      </div>

      <div className="mt-12 grid grid-cols-2 sm:flex sm:gap-8 gap-4 text-sm text-gray-500">
        <div>
          <div className="font-bold text-2xl text-ink">4</div>
          payment modes
        </div>
        <div>
          <div className="font-bold text-2xl text-ink">2%</div>
          protocol fee
        </div>
        <div>
          <div className="font-bold text-2xl text-ink">0.5s</div>
          settlement
        </div>
        <div>
          <div className="font-bold text-2xl text-ink">$0</div>
          gas (USDC-native)
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: '💸',
      title: 'Tips',
      desc: 'One-time USDC with a message. Chrome extension injects a Tip button into every tweet on X.',
      href: '/gavin',
      demoLabel: 'Try tipping @gavin →',
      color: 'from-pink-500 to-rose-500',
    },
    {
      icon: '📅',
      title: 'Subscriptions',
      desc: 'Monthly/yearly USDC subs with per-second accrual. Auto-prorated refunds on cancel. 2% vs Patreon\'s 10%.',
      href: '/demo-blog',
      demoLabel: 'See Substack-style paywall →',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: '🔒',
      title: 'Content Paywall',
      desc: 'Gate articles, videos, courses. Buyers pay once, access forever. On-chain receipt — works even if you disappear.',
      href: '/demo-product',
      demoLabel: 'See Gumroad-style store →',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: '⚡',
      title: 'Pay-per-call API',
      desc: 'x402-compatible billing. batchPay 100 credits in one tx. Perfect for AI agents paying per inference.',
      href: '/demo-agent',
      demoLabel: 'Watch an agent pay →',
      color: 'from-amber-500 to-orange-500',
    },
  ];
  return (
    <section id="features" className="max-w-5xl mx-auto px-6 py-16 md:py-20 border-t border-gray-200">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <h2 className="text-3xl md:text-4xl font-bold">Four primitives. One URL.</h2>
        <Link href="/build" className="text-sm font-semibold text-accent hover:underline">developer docs →</Link>
      </div>
      <p className="text-gray-600 mt-3 max-w-2xl">
        Every creator gets <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">arcpay.finance/yourname</code> — one page, all four payment modes. Share it anywhere.
      </p>

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        {items.map(i => (
          <Link
            key={i.title}
            href={i.href}
            className="group p-6 rounded-3xl bg-white border border-gray-200 hover:border-ink hover:shadow-lg transition block"
          >
            <div className={`inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br ${i.color} text-white items-center justify-center text-2xl`}>
              {i.icon}
            </div>
            <h3 className="font-bold text-xl mt-4">{i.title}</h3>
            <p className="text-gray-600 mt-1.5 leading-relaxed">{i.desc}</p>
            <div className="mt-4 text-sm font-semibold text-accent group-hover:underline">
              {i.demoLabel}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LiveDemos() {
  const demos = [
    {
      href: '/demo-blog',
      kicker: 'Substack replacement',
      title: '📝 Paywalled blog post',
      desc: 'Visit, subscribe in USDC, watch the article auto-unlock. Contract = subscriber DB.',
      stack: 'Subscriptions',
      tone: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    },
    {
      href: '/demo-product',
      kicker: 'Gumroad replacement',
      title: '🛒 Single-product page',
      desc: 'Cover art, description, Buy button. Purchase once, own forever. Receipt on-chain.',
      stack: 'Content Paywall',
      tone: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    },
    {
      href: '/demo-agent',
      kicker: 'x402 / Agentic Commerce',
      title: '🤖 AI agent pay-per-call',
      desc: 'Prepay 10 API credits in one tx. Sign each call, server verifies, translation returned.',
      stack: 'Pay-per-call',
      tone: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    },
    {
      href: 'https://github.com/wanggang22/arcpay/releases',
      external: true,
      kicker: 'Twitter tipping',
      title: '🐦 Chrome extension',
      desc: 'Load unpacked → every tweet gets a 💸 Tip button. Tips held on-chain until recipient claims.',
      stack: 'Tips · Tip-by-handle',
      tone: 'bg-pink-50 border-pink-200 hover:border-pink-400',
    },
  ];
  return (
    <section id="demos" className="max-w-5xl mx-auto px-6 py-16 md:py-20 border-t border-gray-200">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-bold">Live demos</div>
          <h2 className="text-3xl md:text-4xl font-bold mt-1">Play with it — not just a pitch deck</h2>
        </div>
        <Link href="/faucet" className="text-sm font-semibold text-accent hover:underline">💧 Get test USDC first →</Link>
      </div>
      <p className="text-gray-600 mt-3 max-w-2xl">
        Each mode has a real, deployed, clickable demo on Arc testnet. Sign in with email, hit the faucet, try them.
      </p>

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        {demos.map(d => {
          const inner = (
            <>
              <div className="text-[11px] uppercase tracking-wider font-bold text-gray-500">{d.kicker}</div>
              <div className="font-bold text-xl mt-1">{d.title}</div>
              <p className="text-gray-600 mt-1.5 text-sm leading-relaxed">{d.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-500">{d.stack}</span>
                <span className="text-sm font-semibold text-ink">Open demo →</span>
              </div>
            </>
          );
          const cls = `group p-5 rounded-3xl border-2 transition shadow-sm hover:shadow-md block ${d.tone}`;
          return d.external ? (
            <a key={d.title} href={d.href} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={d.title} href={d.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ExtensionShowcase() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-20 border-t border-gray-200">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-block px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 text-[11px] font-bold uppercase tracking-wider">
            Chrome extension
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 leading-tight">
            Tip any X user with USDC,<br />
            right from the timeline.
          </h2>
          <p className="text-gray-600 mt-4">
            Install the extension → every tweet gets a 💸 button. Viewer clicks → popup window → Privy sign in → signature → tip lands. Even if the recipient hasn&apos;t joined ArcPay yet, tips are held on-chain keyed by their X handle, claimable anytime via Twitter OAuth.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href="https://github.com/wanggang22/arcpay/releases" target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full bg-ink text-paper text-sm font-bold hover:opacity-90">
              Download v0.2.0 ↓
            </a>
            <Link href="/claim" className="px-5 py-2.5 rounded-full border-2 border-ink text-sm font-bold hover:bg-ink hover:text-paper transition">
              Claim pending tips
            </Link>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Load unpacked in Chrome / Edge / Brave. MV3 manifest, all open source.
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl">
          {/* Mock tweet with injected button */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
              <div>
                <div className="font-bold text-sm">Gavin <span className="text-xs text-gray-400">@gavin</span></div>
                <div className="text-[10px] text-gray-400">2h · mock tweet</div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              Just shipped ArcPay — 4-in-one USDC payment primitive on Arc. Tips, subs, paywalls, pay-per-call. Chrome extension adds a 💸 button right here on X.
            </div>
            <div className="mt-4 flex items-center gap-6 text-gray-500 text-xs">
              <span>💬 24</span>
              <span>🔁 80</span>
              <span>❤ 412</span>
              {/* The injected arcpay button */}
              <span className="ml-auto px-3 py-1 rounded-full text-white text-[11px] font-bold bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-400">
                💸 Tip
              </span>
            </div>
          </div>
          <div className="px-5 py-3 text-[11px] text-gray-500 bg-gray-50 border-t border-gray-100">
            ↑ injected by extension · clicks open arcpay.finance/@gavin
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const uses = [
    { emoji: '✍️', title: 'Newsletter', desc: 'Replace Substack. Take 98% instead of 90%.' },
    { emoji: '🎨', title: 'Creator', desc: 'Replace Patreon/Ko-fi. Global, no Stripe required.' },
    { emoji: '🤖', title: 'AI APIs', desc: 'Charge agents per inference call. Autonomous commerce.' },
    { emoji: '🎮', title: 'Indie Game', desc: 'Sell in-game items with USDC. No app store cut.' },
    { emoji: '🎙️', title: 'Podcast', desc: 'Paywall premium episodes. Instant settlement.' },
    { emoji: '💼', title: 'Freelancer', desc: 'Invoice in USDC. Global clients, no banking delays.' },
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-20 border-t border-gray-200">
      <h2 className="text-3xl md:text-4xl font-bold">Built for</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        {uses.map(u => (
          <div key={u.title} className="p-5 rounded-2xl bg-white border border-gray-200">
            <div className="text-2xl">{u.emoji}</div>
            <div className="font-bold mt-2">{u.title}</div>
            <div className="text-sm text-gray-600 mt-1">{u.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Code() {
  const snippets = [
    {
      tab: '💸 Tip',
      lines: [
        { cls: 'text-gray-500', text: '// One-time tip with a message' },
        { cls: '', text: 'await client.tips.send({' },
        { cls: '', text: '  username: "gavin",' },
        { cls: '', text: '  amount: "0.005",' },
        { cls: '', text: '  message: "great post!",' },
        { cls: '', text: '});' },
      ],
    },
    {
      tab: '📅 Subscribe',
      lines: [
        { cls: 'text-gray-500', text: '// Subscribe 3 months upfront' },
        { cls: '', text: 'await client.subs.subscribe({' },
        { cls: '', text: '  planId: 0n,' },
        { cls: '', text: '  months: 3,' },
        { cls: '', text: '});' },
        { cls: 'text-gray-500', text: '// → paid-until unlocks the paywall' },
      ],
    },
    {
      tab: '🔒 Content',
      lines: [
        { cls: 'text-gray-500', text: '// Buy content once, own forever' },
        { cls: '', text: 'await client.paywall.purchase(contentId, priceWei);' },
        { cls: '', text: '' },
        { cls: 'text-gray-500', text: '// Anywhere, anytime' },
        { cls: '', text: 'const owned = await client.paywall' },
        { cls: '', text: '  .checkAccess(contentId, wallet);' },
      ],
    },
    {
      tab: '⚡ Pay-per-call',
      lines: [
        { cls: 'text-gray-500', text: '// Prepay 100 calls in one tx' },
        { cls: '', text: 'await client.api.batchPay(' },
        { cls: '', text: '  "gavin", "summarize-paper", 100' },
        { cls: '', text: ');' },
        { cls: 'text-gray-500', text: '// SDK signs each call with wallet' },
        { cls: '', text: 'await client.api.call("gavin", "summarize-paper", input);' },
      ],
    },
  ];
  return (
    <section id="code" className="max-w-5xl mx-auto px-6 py-16 md:py-20 border-t border-gray-200">
      <h2 className="text-3xl md:text-4xl font-bold">One SDK. Four modes.</h2>
      <p className="text-gray-600 mt-3 max-w-2xl">
        Install <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">@wanggang22/arcpay-sdk</code>, connect a wallet, start accepting USDC on Arc. No Stripe verification. No country restrictions.
      </p>

      <div className="mt-8 rounded-3xl bg-ink text-paper overflow-hidden border border-gray-800">
        <div className="flex items-center gap-1 px-4 pt-4 overflow-x-auto no-scrollbar">
          {snippets.map((s, i) => (
            <div key={s.tab}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-bold whitespace-nowrap
                ${i === 0 ? 'bg-gray-800 text-white' : 'text-gray-400'}`}>
              {s.tab}
            </div>
          ))}
          <div className="ml-auto text-[10px] text-gray-500 font-mono hidden md:block">ArcPayClient</div>
        </div>

        {/* Render all 4 snippets stacked — actual tab switching is light JS noise for a demo */}
        <div className="grid md:grid-cols-2 gap-0 border-t border-gray-800">
          {snippets.map((s, idx) => (
            <div key={s.tab} className={`p-5 font-mono text-xs md:text-sm overflow-x-auto
              ${idx % 2 === 0 ? 'md:border-r' : ''}
              ${idx < 2 ? 'border-b' : ''}
              border-gray-800`}>
              <div className="text-xs text-accent2 font-bold mb-2">{s.tab}</div>
              {s.lines.map((l, i) => (
                <div key={i} className={l.cls}>{l.text || '\u00A0'}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/build" className="font-semibold text-accent hover:underline">Full developer docs →</Link>
        <span className="text-gray-400">·</span>
        <a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer"
          className="font-semibold text-accent hover:underline">View on GitHub →</a>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-20 border-t border-gray-200">
      <h2 className="text-3xl md:text-4xl font-bold">Why ArcPay</h2>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3"></th>
              <th className="py-3 font-bold">ArcPay</th>
              <th className="py-3 font-semibold text-gray-500">Stripe</th>
              <th className="py-3 font-semibold text-gray-500">Patreon</th>
              <th className="py-3 font-semibold text-gray-500">PayPal</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {[
              ['Fee', '2%', '2.9% + $0.30', '8–12%', '3.5% + $0.49'],
              ['Settlement', '0.5s (Arc)', '2–7 days', 'Monthly batch', '3–5 days'],
              ['Country support', 'Global', '50 countries', '60 countries', '200 countries'],
              ['Currency', 'USDC (native Arc gas)', 'USD', 'USD/EUR', 'USD/EUR'],
              ['Setup', 'Email only', 'Full KYC + biz docs', 'Stripe required', 'Bank account'],
              ['AI-agent friendly', '✓', '✗', '✗', '✗'],
            ].map(([label, ...cells]) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-3 text-gray-600">{label}</td>
                {cells.map((c, i) => (
                  <td key={i} className={`py-3 ${i === 0 ? 'font-bold text-accent' : 'text-gray-500'}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-200 text-sm text-gray-500">
      <div className="flex flex-wrap gap-6 justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-ink">
            <div className="w-6 h-6 rounded bg-arc-gradient" />
            <span className="font-bold">ArcPay</span>
          </div>
          <div className="mt-2">© 2026 — Open source · MIT license</div>
          <div className="mt-0.5 text-[11px]">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">Arc Network</a></div>
        </div>
        <div className="flex flex-wrap gap-8 text-xs">
          <div>
            <div className="font-bold text-ink uppercase tracking-wider text-[10px] mb-2">Product</div>
            <div className="space-y-1.5">
              <Link href="/#demos" className="block hover:text-ink">Live demos</Link>
              <Link href="/dashboard" className="block hover:text-ink">Dashboard</Link>
              <Link href="/faucet" className="block hover:text-ink">Faucet</Link>
              <Link href="/claim" className="block hover:text-ink">Claim tips</Link>
            </div>
          </div>
          <div>
            <div className="font-bold text-ink uppercase tracking-wider text-[10px] mb-2">Developers</div>
            <div className="space-y-1.5">
              <Link href="/build" className="block hover:text-ink">Developer docs</Link>
              <a href="https://github.com/wanggang22/arcpay" target="_blank" rel="noopener noreferrer" className="block hover:text-ink">GitHub</a>
              <a href="https://github.com/wanggang22/arcpay/releases" target="_blank" rel="noopener noreferrer" className="block hover:text-ink">Chrome extension</a>
            </div>
          </div>
          <div>
            <div className="font-bold text-ink uppercase tracking-wider text-[10px] mb-2">Legal</div>
            <div className="space-y-1.5">
              <Link href="/privacy" className="block hover:text-ink">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
