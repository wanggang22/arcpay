# @arcpay/embed

Embed ArcPay payment buttons in any website with one line of HTML.

## Quick start

```html
<script src="https://cdn.arcpay.io/embed.iife.js"></script>
<arcpay-tip to="alice" amount="0.005"></arcpay-tip>
```

That's it. Visitors see a tip button. They can pay with email login (Privy) or their existing wallet, all inside an isolated iframe — no scripts touch your page.

## Components

### `<arcpay-tip>`
One-time USDC tip.

```html
<arcpay-tip to="alice" amount="0.005" network="testnet"></arcpay-tip>
```

| Attribute | Description | Default |
|-----------|-------------|---------|
| `to` | Creator's ArcPay username | required |
| `amount` | Default tip amount in USDC | `0.005` |
| `network` | `local` or `testnet` | `testnet` |
| `theme` | `light` or `dark` | `light` |

### `<arcpay-subscribe>`
Monthly USDC subscription.

```html
<arcpay-subscribe to="alice" plan-id="0"></arcpay-subscribe>
```

| Attribute | Description |
|-----------|-------------|
| `to` | Creator's username |
| `plan-id` | Plan ID (from your dashboard) |

### `<arcpay-paywall>`
Pay-once-access-forever for premium content.

```html
<arcpay-paywall to="alice" content-id="0x..."></arcpay-paywall>
```

### `<arcpay-call>`
Per-call API payment.

```html
<arcpay-call to="alice" api-name="ai-summarize"></arcpay-call>
```

## How it works

1. The web component renders an iframe pointing to `arcpay.io/embed/<username>`
2. The iframe is sandboxed; your site's CSP/cookies are unaffected
3. Inside the iframe, Privy handles auth (email, social, wallet)
4. Payment flows through ArcPay's smart contracts on Arc Network
5. Once paid, iframe posts a `arcpay:paid` message to parent (you can listen)

## Listening for events

```javascript
window.addEventListener('message', (e) => {
  if (e.data?.type === 'arcpay:paid') {
    console.log('Payment received!', e.data);
    // → unlock content, show thank you, etc.
  }
});
```

## Security

- Sandboxed iframe (no script access to host page)
- `referrerpolicy="no-referrer"` (your visitors' browsing not leaked)
- Lazy loading (no perf cost until visible)
- Open source — verify the bundle yourself

## Self-hosting

You can serve `embed.iife.js` from your own CDN. Just point the script tag to your URL.

## License

MIT
