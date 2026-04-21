import Link from 'next/link';

export function BuildOn() {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="max-w-2xl mb-16">
        <div className="font-mono text-xs text-accent tracking-wider mb-3">
          TWO SURFACES
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-ink">
          Build on ArcPay.
        </h2>
        <p className="text-ink/70 text-lg mt-5 leading-relaxed max-w-[55ch]">
          Your team ships in hours, not quarters — whether you&apos;re launching
          a new revenue line or adding USDC rails to the stack you already have.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-stretch">
        <div className="md:col-span-7 rounded-2xl border border-hairline bg-white p-8 md:p-10 flex flex-col">
          <div className="font-mono text-xs text-ink/50 tracking-wider mb-3">
            SCAFFOLD · CLI
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight text-ink max-w-[22ch]">
            Ship a payment app in 30 seconds.
          </h3>
          <div className="mt-6 rounded-lg bg-ink text-paper font-mono text-sm p-4">
            $ npm create arcpay my-saas
          </div>
          <ul className="mt-6 space-y-2.5 text-ink/75 text-[15px] leading-relaxed max-w-[50ch]">
            <li className="flex gap-3">
              <span className="text-accent font-mono text-xs pt-1.5">01</span>
              <span>
                5 production templates: tip page · subscription platform ·
                content paywall · metered API · AI-agent gateway
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-mono text-xs pt-1.5">02</span>
              <span>MIT license, self-host, no vendor lock-in</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-mono text-xs pt-1.5">03</span>
              <span>First on-chain transaction on testnet in under a minute</span>
            </li>
          </ul>
          <div className="mt-auto pt-8">
            <div className="text-xs text-ink/50 font-mono mb-3">
              BUILT FOR
            </div>
            <p className="text-ink/70 text-sm leading-relaxed max-w-[50ch]">
              Product teams launching new revenue lines, consultancies
              prototyping for clients, founders at MVP stage.
            </p>
            <Link
              href="/build#templates"
              className="inline-block mt-6 font-semibold text-accent hover:underline underline-offset-4"
            >
              Read the template docs →
            </Link>
          </div>
        </div>

        <div className="md:col-span-5 rounded-2xl border border-ink bg-ink text-paper p-8 md:p-10 flex flex-col">
          <div className="font-mono text-xs text-accent tracking-wider mb-3">
            INTEGRATE · SDK
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight text-paper max-w-[16ch]">
            One line to accept USDC.
          </h3>
          <div className="mt-6 rounded-lg bg-paper text-ink font-mono text-sm p-4 leading-relaxed">
            <span className="text-ink/50">await </span>
            client.api.batchPay(
            <br />
            &nbsp;&nbsp;&apos;gavin&apos;, &apos;summarize-paper&apos;, 100
            <br />
            );
          </div>
          <ul className="mt-6 space-y-2.5 text-paper/80 text-[15px] leading-relaxed">
            <li className="flex gap-3">
              <span className="text-accent font-mono text-xs pt-1.5">01</span>
              <span>TypeScript + Python parity — same methods, same types</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-mono text-xs pt-1.5">02</span>
              <span>
                Every primitive is a 1-line call — no webhooks, no reconciliation
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-mono text-xs pt-1.5">03</span>
              <span>
                Works alongside your Stripe, your auth, your database
              </span>
            </li>
          </ul>
          <div className="mt-auto pt-8">
            <div className="text-xs text-paper/50 font-mono mb-3">BUILT FOR</div>
            <p className="text-paper/70 text-sm leading-relaxed">
              SaaS adding AI metering, media adding paywalls, agent marketplaces
              enabling autonomous purchase.
            </p>
            <a
              href="https://www.npmjs.com/package/@wanggang22/arcpay-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 font-semibold text-accent hover:underline underline-offset-4"
            >
              View on npm →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
