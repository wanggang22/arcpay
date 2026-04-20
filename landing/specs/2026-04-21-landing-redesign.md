# ArcPay landing redesign — design spec

**Date:** 2026-04-21
**Owner:** Gavin (CEO) · Claude (tech PM)
**Scope:** `arcpay/landing/` — `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, plus asset drops into `public/`.
**Non-scope (this spec):** `app.arcpay.finance` dashboard, `docs.arcpay.finance` Nextra site, sub-pages of landing (`/build`, `/[username]`, `/demo-*`, `/dashboard`, etc.) — those will need a follow-up pass once token cascade lands.

## 1. Context

Current landing (`landing/app/page.tsx`, 479 lines) exposes the product correctly but renders with AI-slop signatures: default `system-ui`, `bg-arc-gradient bg-clip-text text-transparent` headline, pastel `bg-*-50` cards with emoji icons, 2×2 card grids, predictable section stack. It "works but is unmemorable." Long-term product value justifies a full rewrite rather than a 60–90 min patch: arcpay spans three subdomains, ships a Chrome extension now under review, has a JS/Python SDK and CLI, and is expected to continue shipping for months. Landing quality compounds.

## 2. Goals / Non-goals

**Goals**
- Remove all AI-slop visual signatures (listed in §6).
- Give the page a single **memorable visual anchor** — the "four paths → one URL" convergence.
- Serve all 4 parallel audiences (developers / creators / X tippers / AI agents) without flattening any of them.
- Keep information density at current level (no marketing fluff expansion).
- Keep execution achievable by a solo dev in one sitting (target: one day of work).

**Non-goals**
- Do NOT ship illustrations, 3D, or hand-drawn marketing art.
- Do NOT redesign dashboard or docs in this spec.
- Do NOT rebuild demos — they stay at their current sub-page paths.
- Do NOT introduce heavy motion (no scroll hijack, no parallax, no backdrop-blur).

## 3. Design direction

**One-line**: Vercel structural skeleton + Resend editorial voice + a custom convergence diagram as hero.

**Typography (via `next/font/google`)**
- Display: `Fraunces` — variable weight 400–700, variable `opsz` 9–144. Used for H1 and H2 decorative italics, large section numbers, hero accent word.
- Body / UI: `Geist Sans` — weights 400/500/600.
- Mono: `Geist Mono` — weights 400/500. Used for all code, URLs, handles, hashes, CLI one-liners.
- Fallbacks: system UI. No Inter anywhere.

**Palette (update `tailwind.config.ts`)**
```
paper     #f7f4ee   (warm ivory, replaces #f7f7fa)
ink       #0a0a0f   (unchanged)
accent    #2d4a3e   (deep forest green — replaces #5b5bd6)
gold      #b8a47e   (antique gold — new, limited use)
hairline  rgba(10,10,15,0.10)  (new utility color)
```
**Delete**: `accent2`, `bg-arc-gradient` background image.

**Grid**
- Max content column: `max-w-6xl` (up from 5xl).
- Horizontal gutter: `px-6 md:px-10`.
- Section vertical rhythm: `py-28 md:py-36` (was `py-16 md:py-20`).
- Asymmetric 12-col grid per section where reasonable (7-col content + 5-col negative space, or inverse).

**Motion — minimal**
- Hero SVG convergence: 4 paths draw-in once on mount, 1.2s ease-out, staggered 80ms.
- Tab switches in Four Modes / For Developers: 150ms cross-fade.
- Anchor-link scroll: smooth, 400ms.
- Forbidden: scroll-jacking, parallax on sections, `backdrop-blur` on scrolling containers, layout-affecting animations (only `transform` and `opacity`).

## 4. Section-by-section spec

### 4.1 Hero
**Layout**: asymmetric 2-col at `md+` — left 7-col text, right 5-col convergence SVG. Stacks on mobile.

**Left column**
- H1: `Four ways to get paid.` (Geist Sans 800) + break + `One URL.` — the `One URL.` clause in Fraunces italic `wght=500 opsz=96`, forest-green `accent` color. Sizes: `clamp(3rem, 7vw, 6.5rem)`, `leading-[0.95]`, `tracking-[-0.03em]`.
- Subhead (Geist Sans 400, `text-lg md:text-xl`, `text-ink/70`, `max-w-[52ch]`): one-sentence positioning from README anchor — "The Stripe of USDC on Arc." Then one line specifying: 2% fee, 0.5s settlement, works with email or wallet, for humans and AI agents.
- CTA row: primary `Start building` (ink solid, Geist 600), ghost `Claim your handle` (border-ink, transparent bg). Followed one line below by a mono chip `$ npm create arc-app` (click-to-copy, hairline border).
- Stats: REMOVED. The 4-number row was a slop pattern; the convergence diagram carries that weight now.

**Right column — the convergence SVG**
- Inline `<svg viewBox="0 0 520 520">`.
- Four source nodes at corners with small labels: top-left `tweet`, top-right `/article`, bottom-left `curl`, bottom-right `agent.py` — each node is a small mono pill with hairline border.
- Four bezier-ish paths converge toward center.
- Center element: mono text `arcpay.finance/@gavin` on a hairline-bordered pill with soft forest green fill, Fraunces italic accent on `@gavin`.
- Stroke: `stroke-ink/20` hairline; center pill stroke `stroke-accent`.
- On mount: paths animate draw-in (stroke-dasharray trick), then center pill fades.

### 4.2 How it works
**Layout**: 3 stacked rows. Each row is a 12-col grid: `01` / `02` / `03` big Fraunces numeral left (2-col), copy middle (6-col), one-line mono artifact right (4-col).

**Content**
- `01 Claim your handle` — one sentence: "Sign in with email or wallet, pick a handle, get `arcpay.finance/@you`." Artifact: `GET /@you → 200 OK`.
- `02 Choose what you sell` — one sentence: "Flip switches for tips, subs, paywalled content, or pay-per-call API." Artifact: `POST /plans → plan_01j…`.
- `03 Share the URL` — one sentence: "Paste your URL anywhere. Tips, subs, purchases, API calls all land on-chain." Artifact: `→ tx 0x8f3a… confirmed 0.4s`.

**Typography**: Fraunces numerals `text-[120px] leading-none` light weight, forest green. Copy: Geist 400, `text-xl md:text-2xl`.

### 4.3 Four modes (replaces Features + LiveDemos)
**Layout**: tabbed explorer. Horizontal tab strip at top, content below in asymmetric 2-col.

**Tabs**: `Tips` · `Subscriptions` · `Content paywall` · `Pay-per-call`. Active tab: ink underline, forest green label. Inactive: `text-ink/50`.

**Per-tab content**
- Left 7-col: kicker (12px mono uppercase forest green), headline (Fraunces 600 `text-4xl`), 2-sentence description, link `See the demo →` pointing to the existing demo sub-page.
- Right 5-col: real SDK code snippet in a terminal-styled card (ink bg, paper text, Geist Mono, hairline border, soft shadow). Each snippet uses the real SDK function name.

**Replaces**: the current 4-card `Features` and 4-card `LiveDemos` sections. The sub-page links are preserved, so `/demo-blog` `/demo-product` `/demo-agent` `/gavin` all remain reachable.

### 4.4 For developers
**Layout**: full-width section with a 3-tab code card plus a row of artifact chips below.

**Tabs**: `JS / TypeScript` · `Python` · `x402 curl`. Each tab shows a realistic, copy-pasteable snippet — not marketing pseudo-code. Signatures MUST match `sdk/js/src/client.ts` as of 2026-04-21 (verified) **plus the SDK v0.1.1 additions listed in §8.0 below**:

- JS tab: `pnpm add @wanggang22/arcpay-sdk` + `import { ArcPayClient } from '@wanggang22/arcpay-sdk'` + a 6-line example showing the AI-agents pattern: `client.api.batchPay(username, endpointName, count)` prepays N credits, then `client.api.call(...)` per inference.
- Python tab: `pip install arcpay` + basic tip call using the real module.
- x402 curl tab: real curl against `POST /api/demo-translate` (the route exists at `landing/app/api/demo-translate/route.ts`). The real wire protocol is a JSON body `{ callId, signature, text, endpointId }` — NOT `X-PAYMENT-*` headers. Show a real `curl -X POST -H 'Content-Type: application/json' -d '{"callId":"...", "signature":"0x...", "text":"Hola", "endpointId":"0x..."}'` and a real response shape `{ ok: true, message: "x402 verified · credit consumed", translation: "..." }`. Do NOT invent `X-PAYMENT-PROOF`-style headers.

**Rule**: every code snippet must be runnable as-is against the published npm package at the time landing ships. Grep check on merge: no method appears in `page.tsx` that isn't exported by `@wanggang22/arcpay-sdk` at the version pinned in `landing/package.json`.

**Artifact row** (hairline-bordered mono chips, no color backgrounds):
- `create-arc-app v0.1.0`
- `@wanggang22/arcpay-sdk v0.1.0`
- `python arcpay 0.1.0`
- `github.com/wanggang22/arcpay`

### 4.5 Chrome extension
**Layout**: unchanged 2-col, visual rework only.

**Left column** (text): retain current copy but re-typeset — kicker `CHROME EXTENSION` (mono uppercase forest green), Fraunces H2 (no emoji), paragraph, 2 CTAs (Download, Claim pending tips), "Load unpacked in Chrome / Edge / Brave" micro-note.

**Right column** (mock tweet): redraw with authentic X styling — avatar circle (flat ink), handle in gray, tweet body in X's actual text color `#0f1419`, action icons in X's gray `#536471`. The injected tip chip becomes: forest green outline pill containing `⚡ Tip` (Geist 600), matching the extension icon aesthetic. No gradients. Below: mono caption "↑ injected by extension · clicks open arcpay.finance/@gavin".

### 4.6 For AI agents (NEW)
**Layout**: 2-col asymmetric — 6/6. Left editorial text, right terminal.

**Left column**
- Kicker: `FOR AGENTS`.
- Fraunces H2: `Autonomous payments, down to the inference call.`
- 60-word paragraph covering: x402-compatible, `batchPay` prepays N credits in one tx, SDK signs each call, no human-in-loop required, works from any runtime.
- Link: `Read the agent spec →` → `/build#agents`.

**Right column** (terminal card, ink bg, paper text, Geist Mono `text-sm`). Must match the real demo API at `landing/app/api/demo-translate/route.ts`:

```
$ curl -X POST https://arcpay.finance/api/demo-translate \
  -H "Content-Type: application/json" \
  -d '{"callId":"12","signature":"0xa3f1…","text":"Hola","endpointId":"0x8f3a…"}'
→ 200 OK
  {
    "ok": true,
    "message": "x402 verified · credit consumed",
    "translation": "Hello",
    "callId": "12"
  }
```

### 4.7 Comparison
**Layout**: typographic table. No card backgrounds. No pastel. Hairline-border table, mono numbers right-aligned.

**Columns**: `·` · `ArcPay` · `Stripe` · `Patreon` · `PayPal` · `Custom contract`.
**Rows**: Fee · Settlement · Country support · Currency · Setup · AI-agent friendly · Open source.

**Styling**: ArcPay column header gets a subtle forest-green left-accent rule; its cells are bold ink; competitor cells are `text-ink/60`. Checkmarks: `✓` (not emoji) and `—`, not ✗ or ✅.

### 4.8 Get started
**Layout**: centered (exception to asymmetric rule — end-of-page CTA should feel decisive), `max-w-3xl`.

**Content**
- Fraunces H2: `Start shipping.`
- One mono line with copy-to-clipboard: `$ npm create arc-app@latest`.
- Two ghost links: `Get testnet USDC →` · `Read the docs →`.
- Below, one line: `MIT · no KYC · self-custodial`.

### 4.9 Footer
**Layout**: 4-col grid at `md+`. Much reduced.

**Content**
- Col 1: ArcPay wordmark (no gradient logo square — a single forest-green `⚡` next to Geist 700 text), copyright, "Built on Arc Network" link.
- Col 2 `Product`: Live demos · Dashboard · Faucet · Claim tips.
- Col 3 `Developers`: Docs · GitHub · Chrome extension · npm.
- Col 4 `Company`: Privacy · Blog · X profile.
- Bottom rule: hairline `border-ink/10`, nothing else.

## 5. Copy direction

**Rewrite all English copy** against these rules:

- No slop phrases: "seamlessly", "just shipped", "unlock", "powerful", "elevate", "game-changer", "programmable like the internet", "Play with it — not just a pitch deck".
- Every claim is a concrete number, API name, or verb. Not "fast" — "0.5s". Not "cheap" — "2%". Not "easy to integrate" — `pnpm add @wanggang22/arcpay-sdk`.
- Sentence length: one idea per sentence. H2 subheads cap at 10 words.
- Em-dashes over hyphens for asides. Curly quotes, not straight.
- No emoji in H1/H2/H3. Body text may use `→`, `·`, `⚡` sparingly (⚡ only in the Chrome extension mock and footer wordmark where it matches the extension icon).

**Hero subhead** exact text proposed:
> The Stripe of USDC on Arc. 2% fee, 0.5s settlement, native USDC gas — for humans and AI agents. Sign in with email or wallet.

## 6. Anti-patterns (hard bans)

- `bg-gradient-*` anywhere
- `bg-clip-text text-transparent`
- `rounded-3xl`
- Emoji in H1 / H2 / H3 / page titles / tab labels
- Pastel backgrounds (`bg-*-50`, `bg-*-100`)
- Default `system-ui` / Arial / Inter font-family
- The `arc-gradient` background image
- `w-8 h-8 rounded-lg bg-arc-gradient` logo square (use `⚡` glyph or small svg)
- Stats row with 4 equal columns
- `backdrop-filter: blur()` on scrolled containers
- Animating `width` / `height` / `top` / `left` (use `transform` / `opacity` only)

## 7. Required affirmatives

- Fraunces + Geist Sans + Geist Mono via `next/font/google` in `app/layout.tsx`.
- `ink` unchanged at `#0a0a0f`.
- `paper` updated to `#f7f4ee`.
- Single `accent` token, no secondary colored accents outside `gold`.
- Hairline borders everywhere (`border-ink/10`).
- All code examples are real — import from real SDK module names that exist in `sdk/js/` and `sdk/python/`.
- `max-w-6xl` + asymmetric 12-col grids.
- Motion limited to §3 motion budget.

## 8. Files touched

### 8.0 Pre-landing SDK work (blocks §4.4 truthfulness)

Before any landing code is written, close the marketing-vs-code gap so `client.api.batchPay(...)` is a real export, not a marketing lie:

- **`sdk/js/src/client.ts`** — add `PayPerCallClient.batchPay(username, endpointName, count)` that wraps the already-deployed `PayPerCall.sol::batchPay(bytes32 endpointId, uint256 count)`. The wrapper resolves `endpointId` via `getEndpointByName(username, endpointName)`, computes `value = pricePerCall * count`, then calls `writeContract`. This is ~30 lines; the exact on-chain call pattern already exists verbatim in `landing/app/demo-agent/page.tsx` around line 118–124 — lift that into the SDK. Signature to expose: `async batchPay(username: string, endpointName: string, count: number | bigint): Promise<Hex>`.
- **`sdk/js/src/index.ts`** — ensure `batchPay` is re-exported via `ArcPayClient.api`.
- **`sdk/js/package.json`** — bump `version` from `0.1.0` to `0.1.1`.
- **Publish**: `npm publish --access public` to `@wanggang22/arcpay-sdk@0.1.1`.
- **Smoke test**: from an empty scratch dir, `pnpm add @wanggang22/arcpay-sdk@0.1.1`, run a one-liner that constructs the client and calls `batchPay` against testnet — must return a tx hash without throwing "method not found."

**Python SDK**: for this round the Python code tab shows the existing `tips.send` pattern only. Adding `batchPay` to Python is out of scope; the Python tab does NOT reference it.

**After SDK v0.1.1 ships**, proceed to the landing files below.

### 8.1 Landing files

1. `landing/tailwind.config.ts` — extend colors (paper/accent/gold/hairline), add fontFamily (fraunces/sans/mono tokens), remove `arc-gradient` bg image, remove `accent2`.
2. `landing/app/layout.tsx` — import Fraunces / Geist Sans / Geist Mono via `next/font/google`; attach CSS variables to `<body>`.
3. `landing/app/globals.css` — map `--font-fraunces`, `--font-sans`, `--font-mono` to Tailwind `font-family` tokens; add utility classes if needed.
4. `landing/app/page.tsx` — full rewrite. Keep the 9 component functions (Hero, HowItWorks, FourModes, ForDevelopers, ChromeExtension, ForAgents, Comparison, GetStarted, Footer) in same file; extract to `components/` only if file passes 600 lines.
5. `landing/public/` — drop 4 demo screenshot PNGs if not already present (use existing `store-assets/screenshot-*.png` as source material).
6. `landing/components/Convergence.tsx` (NEW) — the 4-path SVG convergence diagram + draw-in animation.
7. `landing/components/CodeTabs.tsx` (NEW) — reused tabbed code block for Four Modes and For Developers.
8. `landing/components/CopyLine.tsx` (NEW) — mono line with copy-to-clipboard.

**Untouched this round**: any sub-page under `landing/app/` (e.g. `/build`, `/dashboard`, `/demo-*`, `/[username]`, `/claim`, `/faucet`, `/privacy`). Expect some of these to visibly drift (old `bg-arc-gradient` references will break). Follow-up spec will handle sub-page pass.

## 9. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Palette/token changes cascade-break sub-pages (verified: 14 sub-pages reference `bg-arc-gradient` / `accent2` / `from-*-500` as of 2026-04-21) | **Deprecated-alias strategy**: in the new `tailwind.config.ts`, keep `accent2` mapped to its old hex and keep `arc-gradient` as a defined bg-image alias (both marked `@deprecated` in a comment). Sub-pages render visually acceptable in the interim. Remove aliases in the sub-page follow-up spec (§11.1). Do NOT silently delete tokens. |
| Fraunces loading shifts layout | Use `next/font` with `display: 'swap'`, set stable `font-size` on html, reserve space for H1 with `min-h`. |
| SVG convergence looks amateur if under-crafted | Iterate at least 3 times; reference Stripe `/customers` convergence diagrams and Linear `/method` geometry. **90-min fallback**: if the SVG still does not feel distinctive after 90 minutes of iteration, pivot to a **typographic-only hero**: oversized `arcpay.finance/@handle` in mono pill center-stage, Fraunces italic accent on `@handle`, hairline concentric underline rings radiating outward. No SVG. This keeps the "URL as product" anchor without illustration risk. |
| Mobile layout regresses | Mobile-first review pass after desktop ships; single-column with stacked order: H1 → convergence → subhead → CTAs. |
| Demo page screenshots look dated | Accept for this pass; fresh screenshots are §11 follow-up. |
| Chrome extension icon (indigo→pink gradient, already uploaded to Chrome Web Store 2026-04-21) will clash with new forest-green landing palette | Accept short-term mismatch. The extension icon lives in the Chrome Web Store thumbnail and in-browser action bar, not in the landing hero. Plan an icon refresh in follow-up spec once landing lands. |
| SDK function names referenced in code tabs (`client.tips.send`, `client.subs.subscribe`, `client.paywall.purchase`, `client.api.batchPay`) must match real exports | Verify against `sdk/js/src/` before writing snippets. If mismatched, either update the spec or update the SDK — do not ship fake signatures. |

## 10. Out of scope / deferred

- Redesign of sub-pages (separate spec).
- Redesign of `app.arcpay.finance` and `docs.arcpay.finance`.
- Animated demo videos in Four Modes tabs (static screenshots for now).
- Internationalization (English only).
- Dark mode (ship light-only now; dark is a separate v2).
- OG image refresh.

## 11. Follow-up work (tracked, not this round)

1. Sub-page visual pass to absorb new tokens.
2. OG image (`/og` route) update.
3. Dark mode spec.
4. `docs.arcpay.finance` Nextra theme alignment.
5. New demo screenshots / recordings per Four Modes tab.

## 12. Success criteria

- No AI-slop signatures per §6 checklist remain in landing `page.tsx`.
- Hero convergence (SVG or typographic fallback) is the first thing visible on desktop.
- Page renders at 1440×900, 1024×768, 375×812 without layout breaks.
- Lighthouse mobile score ≥ 90 (Performance + Best Practices).
- First Contentful Paint on throttled 4G ≤ 2.0s.
- Zero console errors at `/` load.
- All internal links resolve (no broken routes).

## 13. QA gate (must pass before landing is merged)

Verification is a blocker, not optional polish. Before declaring the redesign done:

1. **Viewport screenshots**: capture at 1440×900 (desktop), 1024×768 (small desktop / iPad landscape), 375×812 (iPhone). Attach to the PR description.
2. **Live fact-check against baseline**: open the current live `arcpay.finance` and put a side-by-side screenshot next to the new local version at each viewport.
3. **Console cleanliness**: Chrome DevTools console shows 0 errors and 0 warnings on `/` load (excluding React 19 third-party warnings).
4. **Internal link check**: every `<Link>` and `<a>` in `page.tsx` returns HTTP 200 (or intentional external). Script this with a one-liner if needed.
5. **Cascade smoke test**: open at least 5 sub-pages (`/build`, `/dashboard`, `/demo-blog`, `/demo-product`, `/demo-agent`) locally; if any have visually broken layouts beyond the acceptable drift described in §9 deprecated-alias strategy, either fix inline or stop and escalate before merge.
6. **Lighthouse**: mobile run on `/`, verify score ≥ 90 on Performance AND Best Practices.
7. **SDK signature audit**: grep final `page.tsx` for every `client.*` call; cross-check each against the published exports of `@wanggang22/arcpay-sdk` at the version pinned in `landing/package.json` (expected: `>=0.1.1`). Any call that doesn't resolve to a real export fails merge. The `batchPay` wrapper must be confirmed live on npm before this gate passes.

If any gate fails, stop. Do not merge and claim it's done.
