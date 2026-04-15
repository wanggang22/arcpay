export default function Page() {
  return (
    <div>
      <Hero />
      <Features />
      <UseCases />
      <Code />
      <Comparison />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20">
      <header className="flex justify-between items-center mb-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-arc-gradient" />
          <span className="font-bold text-xl">ArcPay</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#features" className="hover:text-accent">Features</a>
          <a href="/docs" className="hover:text-accent">Docs</a>
          <a href="https://github.com/wanggang22/arcpay" className="hover:text-accent">GitHub</a>
          <a href="/dashboard" className="px-4 py-2 rounded-full bg-ink text-paper text-sm font-semibold">Dashboard</a>
        </nav>
      </header>

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
        USDC payments,<br />
        <span className="bg-arc-gradient bg-clip-text text-transparent">programmable like the internet.</span>
      </h1>
      <p className="text-xl text-gray-600 mt-6 max-w-2xl">
        Tips, subscriptions, paywalls, and pay-per-call billing on Arc Network. 2% fee. No Stripe account needed. No gas in a separate token.
      </p>

      <div className="flex flex-wrap gap-4 mt-8">
        <a href="#code" className="px-6 py-3 rounded-full bg-ink text-paper font-semibold hover:opacity-90">
          Start building →
        </a>
        <a href="/dashboard" className="px-6 py-3 rounded-full border-2 border-ink font-semibold hover:bg-ink hover:text-paper transition">
          Get your payment link
        </a>
      </div>

      <div className="mt-12 flex gap-8 text-sm text-gray-500">
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
    { icon: '💸', title: 'Tips', desc: 'Accept one-time USDC tips with a message. BuyMeACoffee replacement.' },
    { icon: '📅', title: 'Subscriptions', desc: 'Monthly/yearly USDC subs. Auto-prorated refunds. 2% vs Patreon 10%.' },
    { icon: '🔒', title: 'Content Paywall', desc: 'Gate articles, videos, courses. Buyers pay once, access forever.' },
    { icon: '⚡', title: 'Pay-per-call API', desc: 'x402-compatible. Charge per API request. Perfect for AI agents.' },
  ];
  return (
    <section id="features" className="max-w-5xl mx-auto px-6 py-20 border-t">
      <h2 className="text-3xl md:text-4xl font-bold">Four primitives. Infinite combinations.</h2>
      <div className="grid md:grid-cols-2 gap-6 mt-12">
        {items.map(i => (
          <div key={i.title} className="p-6 rounded-3xl bg-white border border-gray-200">
            <div className="text-3xl">{i.icon}</div>
            <h3 className="font-bold text-xl mt-3">{i.title}</h3>
            <p className="text-gray-600 mt-1">{i.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function UseCases() {
  const uses = [
    { emoji: '✍️', title: 'Newsletter', desc: 'Replace Substack. Take 98% instead of 90%.' },
    { emoji: '🎨', title: 'Creator', desc: 'Replace Patreon/Ko-fi. Global, no Stripe account needed.' },
    { emoji: '🤖', title: 'AI APIs', desc: 'Charge agents per inference call. Autonomous commerce.' },
    { emoji: '🎮', title: 'Indie Game', desc: 'Sell in-game items with USDC. No app store cut.' },
    { emoji: '🎙️', title: 'Podcast', desc: 'Paywall premium episodes. Instant settlement.' },
    { emoji: '💼', title: 'Freelancer', desc: 'Invoice in USDC. Global clients, no banking delays.' },
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 border-t">
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
  return (
    <section id="code" className="max-w-5xl mx-auto px-6 py-20 border-t">
      <h2 className="text-3xl md:text-4xl font-bold">5 lines of code.</h2>
      <p className="text-gray-600 mt-3 max-w-2xl">
        Install the SDK. Connect a wallet. Start accepting USDC on Arc. No Stripe verification. No country restrictions. No monthly subscription.
      </p>
      <div className="mt-8 rounded-3xl bg-ink text-paper p-6 font-mono text-sm overflow-x-auto">
        <div className="text-gray-500"># Scaffold a payment-ready app</div>
        <div className="mt-2"><span className="text-accent2">$</span> npx create-arc-app my-app</div>
        <div className="text-gray-500 mt-6"># Or install the SDK directly</div>
        <div className="mt-2"><span className="text-accent2">$</span> npm install @arcpay/sdk</div>
        <div className="text-gray-500 mt-6"># Tip a creator — one line</div>
        <div className="mt-2">
          <span className="text-accent">import</span> {`{ ArcPayClient }`} <span className="text-accent">from</span> <span className="text-amber-300">'@arcpay/sdk'</span>
        </div>
        <div>
          <span className="text-accent">const</span> client = <span className="text-accent">new</span> ArcPayClient({`{ network: 'testnet', privateKey }`})
        </div>
        <div>
          <span className="text-accent">await</span> client.tips.send({`{ username: 'alice', amount: '0.005', message: 'great post!' }`})
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 border-t">
      <h2 className="text-3xl md:text-4xl font-bold">Why ArcPay</h2>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-3"></th>
              <th className="py-3 font-bold">ArcPay</th>
              <th className="py-3 font-semibold text-gray-500">Stripe</th>
              <th className="py-3 font-semibold text-gray-500">Patreon</th>
              <th className="py-3 font-semibold text-gray-500">PayPal</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {[
              ['Fee', '2%', '2.9% + $0.30', '8-12%', '3.5% + $0.49'],
              ['Settlement', '0.5s (Arc)', '2-7 days', 'Monthly batch', '3-5 days'],
              ['Country support', 'Global', '50 countries', '60 countries', '200 countries'],
              ['Currency', 'USDC (Arc)', 'USD', 'USD/EUR', 'USD/EUR'],
              ['Setup', 'Email only', 'Full KYC + biz docs', 'Stripe required', 'Bank account'],
              ['AI-agent friendly', '✓', '✗', '✗', '✗'],
            ].map(([label, ...cells]) => (
              <tr key={label} className="border-b">
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
    <footer className="max-w-5xl mx-auto px-6 py-12 border-t text-sm text-gray-500 flex flex-wrap gap-6 justify-between">
      <div>© 2026 ArcPay — Open source, MIT license</div>
      <div className="flex gap-4">
        <a href="https://github.com/wanggang22/arcpay" className="hover:text-ink">GitHub</a>
        <a href="/docs" className="hover:text-ink">Docs</a>
        <a href="https://twitter.com" className="hover:text-ink">Twitter</a>
        <a href="https://arc.network" className="hover:text-ink">Built on Arc</a>
      </div>
    </footer>
  );
}
