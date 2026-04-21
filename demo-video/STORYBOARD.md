# Storyboard — ArcPay demo v2026-04-21

**Format:** 1920×1080
**Audio:** TTS voiceover (Geist-like confident male, mid-age, Apple-keynote register — economy of words) + sparse underscore pad + soft UI clicks on CTA moment.
**VO direction:** "Editorial tech review. No hype. Silence between sentences is a feature. Lean slightly into 'One URL.' and 'batchPay' — those two moments need air."
**Style basis:** [`DESIGN.md`](./DESIGN.md) — warm ivory + ink + forest green, Fraunces/Geist typography, asymmetric 12-col grids.

**Global guardrails:**
- Every beat lives on **ivory paper `#f7f4ee`** unless explicitly inverted (ink background only for the pay-per-call terminal + Four Modes code block inserts).
- **No gradients.** No clip-text. No rounded-3xl. No pastel.
- Only `transform` + `opacity` in motion. No layout animation.
- Fraunces italic appears exactly **three times** in the video: "One URL." (B1), each `01 / 02 / 03` numeral pair (B3-B5 openers — actually just kickers), and the `@gavin` in the final URL reveal (B8). Triple italic = triple emphasis.
- Every beat has at minimum: background warm paper, one hairline rule, one mono artifact, one content layer, one motion verb. Density ~6-8 elements per beat — editorial, not maximalist.

---

## Asset Audit

Screenshot assets must be **re-captured** from the live redesigned site. Old PNG `01-homepage.png` → `08-gavin-api.png` in `demo-video/` show the pre-2026-04-21 purple-gradient landing and are **all deprecated**. Replace via CLI capture (see Step 5 instructions at bottom of this doc).

| Asset | Source | Assign to Beat | Role |
|---|---|---|---|
| `shots/01-hero.png` | `https://arcpay.finance/` @1920×1080 (top) | B1, B2 | Hero convergence SVG + headline, full-bleed |
| `shots/02-how-it-works.png` | `arcpay.finance/` scrolled to #howitworks | B2 | 01/02/03 numerals row |
| `shots/03-four-modes-tips.png` | `arcpay.finance/#modes` Tips tab active | B3 | Tips mode tab + code sample |
| `shots/04-four-modes-subs.png` | `arcpay.finance/#modes` Subscriptions | B4 | Subs tab + code |
| `shots/05-four-modes-paywall.png` | `arcpay.finance/#modes` Content paywall | B5 | Paywall tab + code |
| `shots/06-four-modes-ppc.png` | `arcpay.finance/#modes` Pay-per-call | B6 | batchPay code (star of the show) |
| `shots/07-for-agents.png` | `arcpay.finance` For Agents section | B6 | Terminal curl + response |
| `shots/08-comparison.png` | `arcpay.finance` comparison table | B7 | 2% / 0.5s / native USDC gas |
| `shots/09-get-started.png` | `arcpay.finance` Start shipping section | B8 | CTA `npm create arc-app@latest` |
| `shots/10-extension-tweet.png` | `arcpay.finance` Chrome extension mock | B3 (overlay) | ⚡ Tip chip close-up |

**Decorative overlays (non-screenshot):**
- Vector SVG of the 4-path convergence — rebuilt inline per `landing/components/Convergence.tsx` — used as the isolated "hero anchor" in B1 (draws in over 1.2s).
- A single Geist Mono line `npm create arc-app` copy-line appears in B1 end-frame and B8, typed-on effect.

Total: 10 fresh screenshots + 2 inline vector animations. **All PNGs must come from the NEW landing — do not reuse 01-08 from 2026-04-17.**

---

## Underscore direction

Sparse ambient pad in forest-green emotional register: think Caterina Barbieri's quieter moments or Nils Frahm's *Spaces* piano intros — warm, patient, one sustained note bed with occasional shimmer. Enters with B1 at low volume, sits under VO, swells by +3dB on "batchPay" beat (B6), drops out for 0.4s of silence right before "Start building." (B8), then resolves on a final chord as the final frame holds.

---

## Per-beat direction

### Beat 1 — Hero (0:00–0:04)

**Concept:** The camera is already close-up on the word "Four" as the video starts. Warm ivory fills the frame. The phrase "Four ways to get paid." is typeset in Geist Sans 800 ink, and the *sister* phrase "One URL." lives below it in Fraunces italic forest green — already there, already confident. Simultaneously, to the right, four hairline mono pills at the canvas corners (`tweet` · `/article` · `curl` · `agent.py`) draw four bezier paths converging on a center pill that types on the URL `arcpay.finance/@gavin`. This is the **memory anchor**.

**VO cue:** "Four ways to get paid. One URL."

**Visual layer stack (5+ elements):**
1. Background: solid `#f7f4ee` paper.
2. Headline left (7-col): "Four ways to get paid." Geist Sans 800, `clamp(120px, 7vw, 160px)`, ink, tracking -0.03em, leading 0.95. Fade up + 16px translateY from B-in.
3. Below: "One URL." Fraunces italic 500, forest green `#2d4a3e`, same size bracket. Fade in at +0.3s, optical-sizing auto.
4. Right column (5-col): inline SVG 520×520 — four source pills at corners (mono hairline), four bezier paths animate via `stroke-dasharray` draw-in staggered 80ms over 1.2s, center pill fades in at 1.0s with `arcpay.finance/` mono + `@gavin` Fraunces italic forest green accent.
5. Below headline: mono chip `npm create arc-app` in hairline-bordered ink/5 pill, typed on at 3.2s (30ms per char).
6. Bottom of frame: subtle hairline rule `border-ink/10` at y=980.

**Mood:** Editorial. The kind of opening you get in a Stripe launch video, not a crypto one. Serif + sans pairing communicates "this belongs in the financial canon, not in a meme."

**Animation choreography:**
- Headline ink: fade up + translateY 16→0, 0.4s ease-out, 0→0.4s
- Fraunces italic accent: fade in 0.3→0.7s, ease-out
- SVG paths: `stroke-dasharray` trick, 0.4→1.6s, 80ms stagger
- Center URL pill: fade in 1.2→1.6s
- Mono chip `npm create arc-app`: typed-on from 2.0→3.2s
- Background: no movement. Restraint is the tone.

**Transition to B2:** Hold, then cross-fade 0.3s to B2 (no wipe, no shake — editorial fade).

---

### Beat 2 — Positioning (0:04–0:10)

**Concept:** The hero frame softens into context. The headline shrinks to the upper-left third of the canvas (Stripe launch-video trick — the big idea becomes the brand lockup). On the right, a single card appears: the Comparison row from the landing — `Fee | 2% | 2.9% + $0.30 | 8-12% | 3.5% + $0.49 | gas only` — mono, right-aligned, hairline-bordered. The ArcPay column has its forest-green left accent bar ease-in.

**VO cue:** "Arc Pay is the Stripe of U S D C on Arc — for humans and A I agents."

**Visual layer stack:**
1. Background paper.
2. Shrunken lockup top-left: "ArcPay" wordmark + `⚡` glyph in forest green, small.
3. Large H2 center-left: "The Stripe of USDC on Arc." Fraunces 600, `text-5xl`, ink, italic emphasis only on "Stripe".
4. Sublabel under H2: Geist Mono 14px, uppercase tracked, forest green: `FOR HUMANS AND AI AGENTS`.
5. Right-side comparison row card: hairline-bordered, mono numbers, ArcPay cell bold with left-accent rule, others `text-ink/60`.
6. Hairline rule separating header area from body.

**Mood:** A beat of orientation. Confident but quiet. The viewer is now inside the brand's vocabulary.

**Animation:**
- Header lockup: already in place (inherited from B1 cross-fade).
- H2: fade up + translateY 20→0, 0.5s ease-out, 0→0.5s.
- Sublabel: fade in at 0.6s.
- Comparison card: hairline border *draws in* L→R over 0.5s, then the row contents reveal with a 60ms stagger per cell. ArcPay column's left accent bar slides down top-to-bottom at 1.6s (120ms).

**Transition to B3:** Page-pushes-left 0.4s — B3 enters from right. Use `transform: translateX` + opacity; no layout property animation.

---

### Beat 3 — Tips (0:10–0:17)

**Concept:** We enter the first mode with a split-screen world. Left 7-col: kicker `ONE-TIME USDC` in mono + H2 in Fraunces `Send a tip with a message.` + one-line description. Right 5-col: a **live mock tweet** (X-native colors) with the ⚡ Tip chip in forest green outline pill. The chip pulses once. A Geist Mono code block beneath the tweet shows `await client.tips.send({ username: 'gavin', amount: '0.005', message: 'great post!' })`.

**VO cue:** "Mode one. Tips. Every tweet gets a tip button. Our Chrome extension injects it right next to reply and retweet."

**Visual layer stack:**
1. Background paper.
2. Kicker `01 / TIPS` — Fraunces italic small + mono all-caps, forest green.
3. Fraunces H2: "Send a tip with a message." ink, 48px.
4. Mock tweet card: white bg, hairline border, ink avatar, X-native text color `#0f1419`, muted `#536471`. The tweet body text matches the landing's mock. ⚡ Tip chip bottom-right.
5. Chip animation: pulse scale 1 → 1.08 → 1, 0.4s, once, at 3.0s.
6. Below tweet: `CodeTabs` ink-bg terminal card with `client.tips.send({…})` typed on left-to-right, 18ms per char, color-tokenized.
7. Mono caption under: `→ tx confirmed 0.4s`.

**Mood:** Product shot with restraint. The mock tweet is the proof surface.

**Animation:**
- Left-column text: fade up 0.4s from B2 transition.
- Mock tweet card: scale 0.96→1.0 + fade in 0→0.6s.
- Tip chip pulse: at 3.0s.
- Code block: keyboard-typing effect, 3.0–5.8s.
- Final mono confirmation: fade in at 6.0s.

**Transition to B4:** Mode-carousel slide. B3 translates -10% opacity 0, B4 enters from +10% translate opacity 1. 0.35s total.

---

### Beat 4 — Subscriptions (0:17–0:24)

**Concept:** Same split layout but the right-column artifact is a **creator dashboard fragment** showing "Subscribers: 142 / MRR: $284". On the left, the Fraunces H2 is "Recurring income in one tx." and the code shows `await client.subs.subscribe(planId, 3)`.

**VO cue:** "Mode two. Subscriptions. Like Substack, but creators keep ninety eight percent. Per-second accrual, cancel any time for a prorated refund."

**Visual layer stack:**
1. Background paper.
2. Kicker `02 / SUBSCRIPTIONS` forest green.
3. H2: Fraunces 600 "Recurring income in one tx."
4. Description: Geist Sans 18px ink/70 — 2 sentences matching landing copy.
5. Right: dashboard-style card with live-feel numbers. `Subscribers` + counter `0 → 142` (COUNT UP animation 1.2s). `MRR` next to it, `$0 → $284`.
6. Below dashboard: code block `await client.subs.subscribe(planId, 3)` typed on.
7. Mono caption: `// paid-until unlocks the paywall`.

**Animation:**
- Counter COUNT UP (0 → 142 and 0 → 284), 1.2s ease-out, starts at 2.5s.
- Code typing, 3.2–5.4s.

**Transition to B5:** Same carousel slide, 0.35s.

---

### Beat 5 — Content Paywall (0:24–0:31)

**Concept:** Left column as before. Right column: a **paywalled article mock** — first few lines of body copy visible, rest blurred behind an `Unlock for 0.02 USDC` CTA. The CTA click-animates into a small ✓ receipt badge that then expands into `owned` mono text.

**VO cue:** "Mode three. Content paywall. Gumroad with an on-chain receipt. Pay once, own forever — even if the store disappears."

**Visual layer stack:**
1. Kicker `03 / CONTENT PAYWALL`.
2. H2: "Gate articles, videos, files."
3. Right: article fragment card — visible first paragraph, then 40px gradient-to-transparent mask over blurred lorem (forest-green accent only in the Unlock CTA).
4. "Unlock for 0.02 USDC" button animates at 3.0s → transforms into ✓ badge at 4.0s → `checkAccess → true` mono readout at 4.8s.
5. Code block: `await client.paywall.purchase(contentId, price);` typed on above the article.

**Animation:**
- Blur mask: pre-existing; no motion.
- Button scale pulse at 3.0s, then morph to ✓ badge (cross-fade + scale) at 4.0s.
- `checkAccess` line types at 4.8s.

**Transition to B6:** Same carousel slide, **PLUS** the background cross-fades from ivory paper `#f7f4ee` to ink `#0a0a0f` — this is the tonal pivot into the agents beat. 0.5s.

---

### Beat 6 — Pay-per-call (the hero beat) (0:31–0:41)

**Concept:** This is the **star beat**. Background is ink `#0a0a0f` — the camera has descended into the machine. Left 5-col: kicker `04 / PAY-PER-CALL` gold (not green — gold for the AI agents audience, per DESIGN.md). Fraunces H2 in paper color: "Autonomous payments, down to the inference call." Right 7-col: a full terminal window, Geist Mono paper-color text on ink. Four lines type on in sequence:

```
> await client.api.batchPay('gavin', 'summarize-paper', 100);
  → tx 0x8f3a… confirmed 0.4s · 100 credits prepaid

> const sig = await wallet.signMessage('arcpay-call:' + callId);
  → fetch /api/demo-translate { callId, signature, endpointId, input }
  → 200 OK { ok: true, translation: 'Hello', callId: '12' }
```

The `batchPay('gavin', 'summarize-paper', 100)` specifically gets a typography emphasis — the word `batchPay` is **bold and gold** for ~0.4s then settles back to regular mono weight. This is the audible + visible moment we're paying for.

**VO cue:** "Mode four. Pay-per-call. An agent prepays one hundred inference credits in a single transaction. Every call after that is a wallet signature. x four zero two, E R C eight one eight three."

**Visual layer stack (higher density — the hero beat):**
1. Ink background.
2. Kicker `04 / PAY-PER-CALL` gold, mono uppercase.
3. Fraunces H2 paper color.
4. 2-line description: Geist Sans paper/70.
5. Mono chip `x402 · ERC-8183` gold-bordered hairline pill under H2.
6. Right: terminal window with subtle 1px top rule gold.
7. First line types (batchPay call) — 3.0–4.5s, `batchPay` highlights gold 4.5–4.9s then unstyles.
8. Second line (tx confirmed) fades in 4.9s.
9. Third line (signMessage) types 5.5–6.8s.
10. Fourth/fifth lines (fetch + response) fade in 6.9–8.2s with 200 status lighting up gold briefly.
11. Bottom-right of terminal: live-looking cursor blink.
12. Underscore swells +3dB at 4.5s, the `batchPay` moment.

**Mood:** The proof. "We actually ship this." The viewer is now in the code.

**Transition to B7:** Ink-to-paper reverse cross-fade, 0.5s. Audio dips here.

---

### Beat 7 — Stats flex (0:41–0:46)

**Concept:** Paper returns. Three large numeric flex cards arrange in a **single row** across the canvas — NOT a 3-card grid (we broke that pattern deliberately; DESIGN.md forbids it). Instead: three big numbers typographically weighted like a typographic triptych, hairline dividers between them. Fraunces italic for the number, Geist Mono caption below.

**VO cue:** "Two percent protocol fee. Zero point five second settlement. Native U S D C gas."

**Visual stack:**
1. Paper background.
2. Three vertical divisions: hairline separators.
3. Left: `2%` Fraunces 600 at 220px, forest green. Caption mono: `PROTOCOL FEE`.
4. Center: `0.5s` same treatment. Caption: `SETTLEMENT (ARC)`.
5. Right: `$0` Fraunces. Caption: `SEPARATE GAS`.
6. Faint hairline rule top and bottom bracketing the row.

**Animation:**
- Each number fades up + counts from 0 at its own pace (0→2, 0→0.5, 0→0 (stays)). 1.1s ease-out, staggered 150ms.
- Captions fade in at 1.3s.

**Transition to B8:** Slow cross-fade 0.4s + audio-drop 0.4s silence.

---

### Beat 8 — CTA (0:46–0:50)

**Concept:** The most important frame of the video. Back to the hero layout of B1, but the SVG is gone and what remains is: the URL pill at center canvas with the Fraunces italic `@you` reveal, and the `npm create arc-app` CopyLine just below it. This is what the viewer is supposed to act on.

**VO cue:** "Start building. N P M create arc-app."

**Visual stack:**
1. Paper background.
2. Tiny ArcPay wordmark top-left (inherited).
3. Center canvas: large mono pill (700px wide) containing `arcpay.finance/` + Fraunces italic forest green `@you` (the `@you` types on 1.2s — key moment).
4. Below pill: the CopyLine `$ npm create arc-app` — same component as the landing — hairline bordered ink/5 pill, mono.
5. Below CopyLine: tiny Geist Mono gray text: `MIT · no KYC · self-custodial`.
6. Bottom-right corner: `arcpay.finance` mono 20px paper/50.

**Animation:**
- Center pill fades in + scales 0.96→1 at 0.1s.
- `@you` types on (3 chars, 80ms each) starting 0.7s — this is the intentional silence-before-CTA moment.
- CopyLine fades in at 1.3s.
- Audio resolves at 2.0s with the narration concluding "N P M create arc-app."
- Hold final frame 1.5s after VO ends.

**Transition to end:** Fade-to-paper over 0.6s. No logo bug, no "watch next" CTA — the URL IS the CTA.

---

## Step 5 handoff: what CEO runs

Once this storyboard is approved, CEO runs these in `demo-video/`:

```bash
# 1. Re-capture screenshots from the new landing (one-shot capture)
npx hyperframes browser https://arcpay.finance -o shots/01-hero.png --width 1920 --height 1080
# ... repeat for shots/02-10 per Asset Audit above, scrolling or anchor-linking as noted

# 2. Generate new TTS narration from SCRIPT.md
npx hyperframes tts SCRIPT.md -o narration.wav

# 3. Transcribe for word-level timing
npx hyperframes transcribe narration.wav -o transcript.json

# 4. Lint + preview composition
npx hyperframes lint
npx hyperframes preview         # opens studio

# 5. Render to MP4
npx hyperframes render -o renders/demo-2026-04-21.mp4
```

The re-authored `index.html` (Step 6, next) maps every beat above to a `.clip` block with `data-start/duration/track-index` attributes and pulls the generated `transcript.json` for optional caption overlays.
