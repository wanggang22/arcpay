export const HackathonPost = {
  Preview: () => (
    <>
      <p className="text-xl text-gray-700 leading-relaxed">
        I signed up for lablab.ai&apos;s <em>Agentic Economy on Arc</em> hackathon on a Monday and submitted on a Thursday. In between I scrapped my original idea twice, pivoted the product twice, and ended up shipping a four-mode USDC payment protocol — tip, subscribe, content paywall, and x402 pay-per-call — with a Chrome extension, a live SDK on npm, a dashboard, and this blog. This is the actual build log, warts and all.
      </p>
      <p>
        The idea I came in with was called <strong>ArcRouter</strong>: a single-URL router that swapped between Arc&apos;s stablecoin payment flows and Circle&apos;s CCTP for cross-chain settlement. I built the scaffolding, wrote the contracts, and about sixteen hours in I realized the whole thing was a solution searching for a problem. No creator was going to integrate a router. Creators want a button.
      </p>
      <p>
        So Tuesday morning I threw it out. New plan: <strong>be the button</strong>. One URL per creator, four ways to pay, every receipt on-chain. Call it ArcPay.
      </p>
      <p>
        Here&apos;s what I got right, what I got wrong, and the one feature that I almost cut on Wednesday night that turned out to be the killer demo.
      </p>
    </>
  ),
  Paid: () => (
    <>
      <h2 className="font-serif">The pivot that saved the submission</h2>
      <p>
        ArcRouter failed because I was thinking like a protocol designer and not like a creator. Creators don&apos;t want composability; they want a link they can paste into their bio. Every minute spent designing a router was a minute not spent designing the thing a human would actually click.
      </p>
      <p>
        The new product was embarrassingly simple: <code>arcpay.finance/username</code>. Land there, see four tabs: Tip, Subscribe, Content, and API. Each tab is a different payment mode but the wallet-connect flow is shared. That&apos;s it. That&apos;s the product.
      </p>
      <p>
        The contracts fell out of that framing. One <code>Tips.sol</code> for one-off donations, one <code>Subscriptions.sol</code> for recurring with a cancel-and-prorate function, one <code>Content.sol</code> for one-time purchases of digital goods, and one <code>ApiCredits.sol</code> for prepaid x402 call buckets. I deliberately resisted the urge to unify them. Four small contracts, each readable in one sitting, each doing one thing.
      </p>

      <h2 className="font-serif">The hardest part was not the contracts</h2>
      <p>
        Writing Solidity took maybe four hours. Getting Privy to show the authenticated user&apos;s Twitter avatar took six. Making the Chrome extension inject a Tip button into tweets without breaking Twitter&apos;s own virtualization took another eight.
      </p>
      <p>
        Every hackathon postmortem I&apos;ve ever read warns that the frontend eats more time than you expect. I nodded wisely and then underestimated it by 3x anyway.
      </p>
      <p>
        The specific trap this time was <strong>auth state</strong>. I had six pages (homepage, creator, dashboard, claim, blog, demos) each rendering its own login button. When Privy upgraded a user from logged-out to logged-in, one page would update and another would quietly lag. Classic prop-drilling-vs-context problem. I ended up writing a shared <code>&lt;AuthPill /&gt;</code> component on Wednesday evening and replacing every duplicated bar with it. Two hours of work that I should have done on day one.
      </p>

      <h2 className="font-serif">The killer demo I almost cut</h2>
      <p>
        At 11pm on Wednesday I was looking at my task list and seriously considering dropping the Chrome extension. It was the least finished piece, the hardest to QA, and the Chrome Web Store review process would take longer than the hackathon itself. Rational move: cut it.
      </p>
      <p>
        I kept it because I couldn&apos;t stop imagining the demo clip: Twitter timeline, hover over any tweet, a tiny Tip button appears, click, pay 0.01 USDC, receipt hashes into a block on Arc, all without leaving Twitter. That&apos;s the whole pitch in five seconds. No amount of dashboards would land the same way.
      </p>
      <p>
        So I stayed up. The extension is MV3, content-script injected, and the payment flow opens <code>arcpay.finance/quick-tip/@handle</code> in a popup where the iframe handles Privy auth + wallet sig. A post-message bridges the tx hash back. It&apos;s held together with string but it works, and screenshotting it with Tip buttons showing on <em>Arc&apos;s own tweet</em> and <em>Circle&apos;s own tweet</em> made the Twitter thread basically write itself.
      </p>

      <h2 className="font-serif">What I got wrong</h2>
      <p>
        <strong>1. I scattered contract addresses across five places.</strong> Landing config, dashboard config, SDK defaults, deploy script output, and extension manifest. When I redeployed on day two, three of them were out of sync for an hour. I fixed it by adding a <code>contracts/deployments/current.json</code> SSOT and a <code>sync-addresses.mjs</code> script that regenerates the rest. Should have been step one.
      </p>
      <p>
        <strong>2. I assumed npm scopes were free.</strong> Tried to publish <code>@arcpay/sdk</code>, got a 402 because creating an org-scoped package requires a paid npm org. Renamed to <code>@wanggang22/arcpay-sdk</code> under my personal scope. Not blocking but an ugly brand surface.
      </p>
      <p>
        <strong>3. The demo video took longer than the extension.</strong> I used <code>hyperframes</code> (HTML → MP4) and Edge Neural TTS (<code>en-US-AndrewNeural</code>) for narration, which sounds great, but the framework wouldn&apos;t serve my PNG assets through its file server, and it rejected inline base64 audio. Ended up base64-embedding the images directly in HTML and muxing the MP3 in via ffmpeg as a post step. Worked but cost me three hours.
      </p>

      <h2 className="font-serif">The part nobody talks about</h2>
      <p>
        Hackathons reward <em>finishing</em>. Every judge has seen a hundred half-built prototypes. What they remember is the one where you can click the link, try the thing yourself, and feel the loop close. That means spending day three on polish, not on new features.
      </p>
      <p>
        My day three was entirely unglamorous: fixed the <code>/dashboard</code> path accidentally matching the creator username route (if you logged in and typed <code>arcpay.finance/dashboard</code> you&apos;d end up on the tip page for a user literally named "dashboard" — mortifying). Added a reserved-words redirect table. Added Upstash Redis for x402 replay protection. Wrote docs. Recorded the video. Composed the Twitter thread. Pushed to production.
      </p>
      <p>
        This blog you&apos;re reading right now is also part of the dogfooding. The free preview above is rendered statically; the section you&apos;re reading is gated by a single <code>activeSubOf(wallet, planId)</code> contract read. No Stripe webhooks, no database row for your subscription. The chain is the state.
      </p>

      <h2 className="font-serif">What&apos;s next</h2>
      <p>
        Submission goes in before the April 20 deadline. Then I want to get the Chrome extension properly published (Google&apos;s payment system rejected my card twice so I may start with Edge Add-ons instead), write the next two posts in this blog, and onboard real creators who want to take USDC. If that&apos;s you, the wallet in the header is my inbox.
      </p>
      <p className="text-sm text-gray-500 mt-8">
        — Thanks for reading. Your subscription itself is on-chain: cancel anytime from <a href="/dashboard" className="underline">the dashboard</a> and you&apos;ll get a prorated refund for unused time. That&apos;s the feature I&apos;m proudest of.
      </p>
    </>
  ),
};
