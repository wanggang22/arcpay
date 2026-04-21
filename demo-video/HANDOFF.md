# Demo Video — Handoff

**Status:** composition rebuilt + linted (0 errors, 0 warnings). Ready for **TTS + render** by user.

## What's done

- `DESIGN.md` — brand cheat sheet (forest green + warm ivory + Fraunces/Geist)
- `SCRIPT.md` — new 50-second narration (replaces 2026-04-17 version), references real `client.api.batchPay` + Stripe-on-Arc positioning
- `STORYBOARD.md` — 8 beats per second-by-second creative direction
- `index.html` — composition rebuilt: 8 scoped clips, GSAP timeline, scoped selectors, all anims pure transform/opacity. Passes `npx hyperframes lint`

## What user runs

In `demo-video/` (use cmd or PowerShell, not the sandbox bash):

### 1. (Optional) Re-capture screenshots from new landing
The composition currently uses inline SVG + typography for B1, B2, B6, B7, B8 (no screenshots needed). B3-B5 use mock cards inline. So **you can render right now without any screenshots** and the video works end-to-end.

If you later want real-page screenshots over some beats, re-capture per `STORYBOARD.md` Asset Audit table.

### 2. Generate TTS from new SCRIPT.md
```bash
npx hyperframes tts SCRIPT.md -o narration.wav
```
This replaces the old `narration.mp3`. Pick a voice that matches the storyboard direction ("mid-age confident, Apple keynote register").

### 3. (Optional) Transcribe for word-level timing
```bash
npx hyperframes transcribe narration.wav -o transcript.json
```
Only needed if you want auto-synced captions (current composition has no captions overlay; you can add per the `hyperframes` skill if desired).

### 4. Preview in studio
```bash
npx hyperframes preview
```
Opens browser at the studio editor — scrub the timeline, verify each beat.

### 5. Render final MP4
```bash
npx hyperframes render -o renders/demo-2026-04-21.mp4
```

## Beat timing reference

| # | Beat | Time window | VO line |
|---|---|---|---|
| 1 | Hero (4-path convergence) | 0:00–0:04 | "Four ways to get paid. One URL." |
| 2 | Positioning (Stripe-on-Arc + comparison) | 0:04–0:10 | "ArcPay is the Stripe of USDC on Arc — for humans and AI agents." |
| 3 | Tips (mock tweet + ⚡ chip + SDK code) | 0:10–0:17 | "Mode one. Tips. Every tweet gets a tip button…" |
| 4 | Subscriptions (dashboard counter + code) | 0:17–0:24 | "Mode two. Subscriptions. Like Substack, but creators keep 98%…" |
| 5 | Content paywall (article unlock) | 0:24–0:31 | "Mode three. Content paywall. Gumroad with on-chain receipt…" |
| 6 | Pay-per-call (DARK + batchPay highlight) | 0:31–0:41 | "Mode four. Pay-per-call. An agent prepays 100 inference credits in a single transaction…" |
| 7 | Stats triptych (2% / 0.5s / $0) | 0:41–0:46 | "Two percent protocol fee. Half-second settlement. Native USDC gas." |
| 8 | CTA (`@you` reveal + `npm create arc-app`) | 0:46–0:50 | "Start building. NPM create arc-app." |

## Known constraints

- Total 50s assumes ~110-word narration at ~2.2 wps. If TTS comes out shorter or longer, adjust each clip's `data-start` / `data-duration` proportionally.
- The composition currently does NOT include captions (no transcript-driven word highlighting). If you want captions, run `npx hyperframes transcribe` then add a captions sub-composition per the hyperframes skill.
- Audio sync: `<audio id="vo">` plays on timeline `onStart`, pauses on `onComplete`. If audio offset is needed, edit the `vo.currentTime = 0` line in `index.html` script block.

## Verification gate

Before claiming done, all of the following must pass:

```bash
npx hyperframes lint        # 0 errors, 0 warnings (currently passing)
npx hyperframes preview     # visually verify all 8 beats render correctly
ls renders/                 # mp4 exists, plays in any video player
```
