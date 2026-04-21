# Design System — ArcPay (v2026-04-21)

## Overview

ArcPay is a USDC payments primitive on Arc Network with four audiences in one URL: developers, creators, X tippers, AI agents. The landing pivots from "generic AI-slop purple gradient" (pre-2026-04-21) to a **Vercel-skeleton + Resend-voice** aesthetic: warm ivory paper, deep forest green as the sole accent, Fraunces italic display contrasted with Geist Sans body. The memorable visual anchor is a 4-path SVG diagram converging on `arcpay.finance/@gavin`. Restraint, precision, editorial typography — nothing bouncy.

## Colors

- **Paper (surface)**: `#f7f4ee` — warm ivory. Background everywhere. Matches Stripe's paper tone without the fintech sheen.
- **Ink (content)**: `#0a0a0f` — near-black. All primary text and solid CTAs.
- **Accent (forest green)**: `#2d4a3e` — the one accent color. Italic Fraunces display words, hover states, section kickers, tip pill borders, SVG center pill.
- **Gold (secondary accent)**: `#b8a47e` — antique gold. Used sparingly: tab underline on dark code blocks, subtle hairline on extension icon, restrained highlight. Never dominant.
- **Hairline**: `rgba(10,10,15,0.10)` — 10% ink for all dividers, card borders, section rules. Replaces all `border-gray-200` patterns.
- **Ink/60, Ink/70 (muted)**: `rgba(10,10,15,0.60)` and `0.70` — body subtext, captions.
- **Ink/0.02, ink/0.05 (pressed)**: very light ink tints for hover / pressed states and subtle fills.

## Typography

- **Display (serif, italic emphasis)**: Fraunces. Weights 400/500/600/700, italic 500 for the "One URL." moment. Used for H1/H2, large numerals (`01 02 03` in How it works), and any display-scale accent word in forest green. `clamp(3rem, 7vw, 6.5rem)` at hero, leading 0.95, tracking -0.03em. Optical sizing auto.
- **Body / UI (sans)**: Geist Sans. Weights 400/500/600/700/800. Body text, CTAs, kickers (uppercase tracked). `text-lg` / `text-xl` for subheads, `text-sm` for fine print.
- **Mono**: Geist Mono. Every URL, handle, code snippet, CLI one-liner, stats chip, kicker label, tx hash, API header. Tracking matches the UI font — no extra letter-spacing unless for `uppercase tracking-wider` kickers.
- **Hierarchy**: H1 `clamp(3, 7vw, 6.5rem)` → H2 `text-4xl/5xl font-display 600` → H3 `text-2xl/3xl font-display 600` → body `text-lg` → fine `text-xs font-mono`.

## Elevation

Flat + hairline-first. Cards use `border border-hairline` (10% ink) with no shadow in the default state. The only shadowed surface is the Chrome extension mock tweet card (`shadow-sm`, white bg) and the terminal-style code blocks (soft shadow via `bg-ink text-paper` color inversion). No backdrop-blur on scrolling containers. Animations move only `transform` + `opacity`; never `width/height/top/left`. Bento grid pattern is replaced by **asymmetric 12-col grids** (7-col content + 5-col negative space or inverse).

## Components

- **Convergence SVG**: 4 hairline-bordered mono pills at corners (`tweet`, `/article`, `curl`, `agent.py`) with 4 bezier paths converging to a center pill (soft forest fill, forest stroke, mono `arcpay.finance/` + Fraunces italic `@gavin`). Paths animate on mount via `stroke-dasharray` trick, 1.2s ease-out, 80ms stagger. **The page's memorable anchor.**
- **CopyLine chip**: mono one-liner in a hairline-bordered ink/5 pill, click-to-copy, shows "copy" → "copied" state. Used under hero CTAs (`npm create arc-app`) and in Get Started (`npm create arc-app@latest`).
- **CodeTabs**: ink bg, paper text, Geist Mono, gold underline on active tab, 150ms cross-fade between tabs. Used in Four modes (per-mode single tab) and For developers (3 tabs: JS / Python / x402 curl).
- **Fraunces numeral block**: `01 / 02 / 03` at 120px, weight 300, optical-sizing auto, color accent. Used as HowItWorks step markers.
- **Mock tweet card** (Chrome extension section): white bg, hairline border, X-native text color `#0f1419`, X-native muted `#536471`. The injected ⚡ Tip chip is an outlined forest-green pill — never a filled gradient.
- **Comparison table**: typographic, hairline row dividers, mono numeric cells right-aligned, ArcPay column with a thin forest-green left accent rule. **No card backgrounds, no pastel tints.**
- **For Agents terminal**: full `bg-ink text-paper` block, mono, shows real `curl -X POST /api/demo-translate` + real JSON response. The "proof it actually works" beat.

## Do's and Don'ts

### Do's
- Use Fraunces italic for exactly one emphasis word per display unit. `One URL.` is the canonical example.
- Use forest green only as accent (kickers, links, icons, italic words, one-pixel rules). Paper + ink carry 90% of the surface.
- Show **real** code — real SDK import paths, real function names (`client.tips.send`, `client.api.batchPay`), real URLs. Pseudocode and placeholders are anti-brand.
- Let hairline dividers (10% ink) do the work that borders/shadows would.
- Let typography scale (`clamp`) handle responsive — never stack headline-sized type on mobile if it doesn't fit.

### Don'ts
- Do not use `bg-gradient-*`, `bg-clip-text text-transparent`, `rounded-3xl`, or pastel `bg-*-50/100`. The entire pre-2026-04-21 gradient palette is banned.
- Do not put emoji in H1/H2/H3. ⚡ is allowed in the Chrome extension mock tweet chip and the nav/footer wordmark only — as a *glyph*, not an emoji container.
- Do not animate `width`, `height`, `top`, `left`, or any layout property. Only `transform` and `opacity`.
- Do not use scroll-hijacking, parallax on sections, or `backdrop-filter: blur()` on scrolled containers.
- Do not fake SDK signatures. Every `client.*` call on screen must exist in `@wanggang22/arcpay-sdk@0.1.1` exports.
