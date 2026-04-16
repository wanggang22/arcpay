# ArcPay — X (Twitter) Extension

Injects a **💸 Tip** button under every tweet. Clicking opens `arcpay.finance/{handle}` in a new tab where the viewer completes the tip with email or wallet login.

## Install (developer mode)

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`)
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked** → select this `extension/` folder
4. Visit [x.com](https://x.com) — tip buttons appear on every tweet.

## Files

- `manifest.json` — Chrome Manifest V3 spec
- `content.js` — injects `<button>` into `<article data-testid="tweet">`
- `styles.css` — pill-shaped gradient button
- `popup.html` — tooltip shown when user clicks the extension icon

## Architecture

```
Twitter DOM        Extension                 ArcPay Web
────────────       ──────────                ──────────
tweet article   →  content.js scans handle
                   injects "💸 Tip" btn
                   onclick: window.open(…)  →  arcpay.finance/{handle}
                                                ↳ Privy login
                                                ↳ viem tipByHandle()
                                                ↳ on-chain receipt
```

## Privacy

The extension only reads tweet DOM (handles) — never sends data off-device until a user explicitly clicks **Tip**, which opens arcpay.finance in a new tab.
