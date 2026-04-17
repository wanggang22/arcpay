# Chrome Web Store submission — ArcPay extension

Copy-paste the fields below when submitting at
<https://chrome.google.com/webstore/devconsole>.

---

## Name

```
ArcPay — Tip on X with USDC
```

(44 chars; max 45)

---

## Short description (≤132 chars)

```
Tip any X user with USDC on Arc Network — instant settlement, 2% fee, no KYC. Email or wallet login. Claim later via X OAuth.
```

(130 chars)

---

## Detailed description

```
ArcPay adds a 💸 Tip button under every tweet on x.com — click, send USDC to the author's X handle, done. Payments settle on the Arc Network in under a second. 2% protocol fee, no Stripe, no chargebacks, no country restrictions.

━━━ How it works ━━━

1. Install the extension
2. Scroll x.com as you normally would
3. Each tweet now has a 💸 Tip button next to reply / retweet / like
4. Click it — a new tab opens on arcpay.finance/@handle
5. Sign in with email, Google, Twitter, Discord, Farcaster, or external wallet (via Privy)
6. Pick a USDC amount, leave a message, send

━━━ Recipient without a wallet? No problem. ━━━

If the X user hasn't claimed ArcPay yet, your tip is held on-chain under their handle. They can later visit arcpay.finance/claim, sign in with X OAuth to prove handle ownership, and pull the USDC into any wallet they choose. Trustless: the claim is verified on-chain via a signed attestation — ArcPay never holds your funds.

━━━ More than tips ━━━

ArcPay is a full payment protocol — same wallet + username also supports:
• 📅 Subscriptions (monthly / yearly with auto-prorated refunds)
• 🔒 Content paywalls (gate articles, videos, courses)
• ⚡ Pay-per-call API billing (x402-compatible, ideal for AI agents)

Everything lives at arcpay.finance.

━━━ What this extension does NOT do ━━━

• Does NOT send tweets on your behalf.
• Does NOT read your DMs, likes, or feeds.
• Does NOT track you or run analytics.
• Does NOT store cookies.
• Does NOT call any remote server — all button injection is 100% local to your browser.

The extension only reads the visible DOM of x.com to extract public handles from tweets you're already seeing. No data leaves your device until you explicitly click "Tip", which opens ArcPay in a new tab.

━━━ Links ━━━

• Open source: github.com/wanggang22/arcpay
• Privacy policy: arcpay.finance/privacy
• Docs: arcpay.finance

Arc Network is a purpose-built L1 for payments with native USDC gas — no ETH wrapping, no approvals, sub-second finality.
```

---

## Category

**Primary**: Social & Communication
**Secondary**: Productivity

---

## Language

English

---

## Website URL
```
https://arcpay.finance
```

## Support URL
```
https://github.com/wanggang22/arcpay/issues
```

## Privacy policy URL
```
https://arcpay.finance/privacy
```

---

## Single-purpose description
(Web Store asks extensions to state a single core purpose.)

```
Inject a tip button into each tweet on x.com so viewers can send USDC payments to the tweet's author via the ArcPay protocol on Arc Network.
```

---

## Permission justifications

**host_permissions: x.com, twitter.com**
```
Required to inject the Tip button into tweet DOM on x.com and twitter.com. The content script only reads public tweet authorship data (handles) that the user is already viewing. No data is sent anywhere.
```

**storage**
```
Reserved for future user preferences (preferred tip amount, theme). Not currently used to store any identifiable data.
```

**remote code use**
```
None. The extension bundles all JavaScript locally and does not load any remote code at runtime.
```

---

## Screenshots (1280×800 or 640×400 — at least 1)

Take 3–5 screenshots. Suggested sequence:

1. **Twitter timeline with Tip buttons**
   - Open x.com, install the extension, scroll the timeline. Capture a tweet with the purple-pink 💸 Tip button visible next to reply/retweet.

2. **ArcPay tip page** (arcpay.finance/@handle)
   - Show the creator profile with the tip form and preset amounts.

3. **Privy sign-in modal**
   - On the tip page, click "Sign in" and capture the Privy modal showing Email / Google / Twitter / Discord / Farcaster / External Wallet options.

4. **Tip success**
   - After sending a tip, capture the green "✓ Tip sent!" banner with the transaction link.

5. **Claim flow**
   - Visit arcpay.finance/claim, show the three-step UI (wallet + X OAuth + claim).

Tools: `Win+Shift+S` to snip. Save as PNG, 1280×800 recommended.

---

## Promotional tile (440×280, optional but recommended)

Use the same gradient as the extension icon (indigo → pink) with the text:
```
ArcPay — Tip on X
Pay creators with USDC on Arc
```

You can generate this in Figma, Canva, or any screenshot tool. Not strictly required to publish.

---

## After submission

Chrome reviewer typically responds within 1–3 business days. Common rejection reasons to preempt:

- **Purpose unclear**: we've been explicit above.
- **Unjustified permissions**: we only request host_permissions + storage.
- **Privacy policy missing**: arcpay.finance/privacy is live.
- **Data handling disclosure**: we don't collect analytics, no user data leaves device.

If rejected: read the reviewer's feedback, adjust, re-submit.
