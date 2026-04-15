// @arcpay/embed — Web Components for embedding ArcPay anywhere.
// Usage:
//   <script src="https://cdn.arcpay.io/embed.iife.js"></script>
//   <arcpay-tip to="alice" amount="0.005"></arcpay-tip>

const NETWORKS = {
  local: { rpc: 'http://localhost:8545', chainId: 1337, embedHost: 'http://localhost:4000' },
  testnet: { rpc: 'https://rpc.testnet.arc.network', chainId: 5042002, embedHost: 'https://arcpay.io' },
};

type Mode = 'tip' | 'subscribe' | 'paywall' | 'paycall';

class ArcPayBase extends HTMLElement {
  protected mode: Mode = 'tip';

  connectedCallback() {
    const to = this.getAttribute('to') || 'alice';
    const network = (this.getAttribute('network') || 'testnet') as 'local' | 'testnet';
    const amount = this.getAttribute('amount') || '0.005';
    const planId = this.getAttribute('plan-id') || '';
    const contentId = this.getAttribute('content-id') || '';
    const apiName = this.getAttribute('api-name') || '';
    const theme = this.getAttribute('theme') || 'light';
    const cfg = NETWORKS[network] || NETWORKS.testnet;

    const params = new URLSearchParams({ mode: this.mode, amount, theme });
    if (planId) params.set('plan', planId);
    if (contentId) params.set('content', contentId);
    if (apiName) params.set('api', apiName);

    const src = `${cfg.embedHost}/embed/${to}?${params}`;

    // Use iframe for security isolation + automatic Privy/wallet integration
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:inline-block; width: 100%; max-width: 480px;';

    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.cssText = 'border: none; width: 100%; height: 380px; border-radius: 16px;';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', `ArcPay ${this.mode} for ${to}`);

    // Listen for height changes from iframe
    window.addEventListener('message', (e) => {
      try {
        if (e.source !== iframe.contentWindow) return;
        if (e.data?.type === 'arcpay-resize' && typeof e.data.height === 'number') {
          iframe.style.height = `${Math.max(200, Math.min(800, e.data.height))}px`;
        }
      } catch {}
    });

    wrapper.appendChild(iframe);
    this.appendChild(wrapper);
  }
}

class ArcPayTip extends ArcPayBase { protected mode: Mode = 'tip'; }
class ArcPaySubscribe extends ArcPayBase { protected mode: Mode = 'subscribe'; }
class ArcPayPaywall extends ArcPayBase { protected mode: Mode = 'paywall'; }
class ArcPayCall extends ArcPayBase { protected mode: Mode = 'paycall'; }

if (typeof customElements !== 'undefined') {
  if (!customElements.get('arcpay-tip')) customElements.define('arcpay-tip', ArcPayTip);
  if (!customElements.get('arcpay-subscribe')) customElements.define('arcpay-subscribe', ArcPaySubscribe);
  if (!customElements.get('arcpay-paywall')) customElements.define('arcpay-paywall', ArcPayPaywall);
  if (!customElements.get('arcpay-call')) customElements.define('arcpay-call', ArcPayCall);
}

// Export for ESM users
export { ArcPayTip, ArcPaySubscribe, ArcPayPaywall, ArcPayCall };
