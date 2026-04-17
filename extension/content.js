/*! ArcPay X extension — injects a 💸 Tip button under every tweet,
 * opens a popup window, and shows a toast when a tip is confirmed. */
(function () {
  'use strict';
  const BASE = 'https://arcpay.finance';
  const POPUP_W = 440;
  const POPUP_H = 700;

  // ─── Handle extraction ──────────────────────────────────────

  function extractHandle(article) {
    try {
      const candidates = article.querySelectorAll('[data-testid="User-Name"] a[role="link"][href^="/"]');
      for (const a of candidates) {
        const href = a.getAttribute('href') || '';
        const parts = href.split('/').filter(Boolean);
        if (parts.length === 1 && /^[A-Za-z0-9_]{1,15}$/.test(parts[0])) {
          return parts[0].toLowerCase();
        }
      }
      const anyLinks = article.querySelectorAll('a[href^="/"]');
      for (const a of anyLinks) {
        const href = a.getAttribute('href') || '';
        const parts = href.split('/').filter(Boolean);
        if (parts.length === 1 && /^[A-Za-z0-9_]{1,15}$/.test(parts[0])) {
          return parts[0].toLowerCase();
        }
      }
    } catch {}
    return null;
  }

  function extractTweetId(article) {
    try {
      const links = article.querySelectorAll('a[href*="/status/"]');
      for (const a of links) {
        const m = (a.getAttribute('href') || '').match(/\/status\/(\d+)/);
        if (m) return m[1];
      }
    } catch {}
    return null;
  }

  // ─── Popup + toast ──────────────────────────────────────────

  function openTipPopup(handle, tweetId) {
    const params = new URLSearchParams({ src: 'x-ext' });
    if (tweetId) params.set('ref', tweetId);
    const url = `${BASE}/quick-tip/${encodeURIComponent(handle)}?${params.toString()}`;

    const left = Math.floor((screen.width - POPUP_W) / 2);
    const top = Math.floor((screen.height - POPUP_H) / 2);
    const features = [
      'popup=yes',
      `width=${POPUP_W}`,
      `height=${POPUP_H}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'menubar=no',
      'location=no',
      'scrollbars=yes',
      'resizable=yes',
    ].join(',');

    let popup = null;
    try {
      popup = window.open(url, 'arcpay-tip', features);
    } catch {}

    if (!popup) {
      // Popup blocker — fallback to new tab
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Listen for confirmation from popup via postMessage
    const onMessage = (ev) => {
      if (!ev || !ev.data) return;
      if (ev.data.type === 'arcpay:tipped' && ev.data.handle === handle) {
        showToast(`✓ Tipped @${handle} ${formatAmount(ev.data.amount)} USDC`);
        window.removeEventListener('message', onMessage);
      }
    };
    window.addEventListener('message', onMessage);

    // Auto-detach listener if popup is closed without confirmation
    const poll = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(poll);
          window.removeEventListener('message', onMessage);
        }
      } catch {
        clearInterval(poll);
      }
    }, 800);
  }

  function formatAmount(raw) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n.toFixed(4).replace(/\.?0+$/, '');
    return String(raw || '');
  }

  function showToast(text) {
    let root = document.getElementById('arcpay-toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'arcpay-toast-root';
      document.body.appendChild(root);
    }
    const t = document.createElement('div');
    t.className = 'arcpay-toast';
    t.textContent = text;
    root.appendChild(t);
    // Animate in
    requestAnimationFrame(() => t.classList.add('arcpay-toast-visible'));
    // Auto-dismiss
    setTimeout(() => {
      t.classList.remove('arcpay-toast-visible');
      setTimeout(() => t.remove(), 300);
    }, 4200);
  }

  // ─── Button injection ───────────────────────────────────────

  function createTipButton(handle, tweetId) {
    const btn = document.createElement('button');
    btn.className = 'arcpay-tip-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Tip @${handle} with USDC on ArcPay`);
    btn.title = `Tip @${handle} with USDC on Arc — instant, 2% fee, no KYC`;
    btn.innerHTML =
      '<span class="arcpay-emoji" aria-hidden="true">💸</span>' +
      '<span class="arcpay-label">Tip</span>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTipPopup(handle, tweetId);
    });
    return btn;
  }

  function injectIntoArticle(article) {
    if (!article || article.__arcpayInjected) return;
    const handle = extractHandle(article);
    if (!handle) return;
    const tweetId = extractTweetId(article);

    const actionRow = article.querySelector('[role="group"][aria-label]');
    if (!actionRow) return;

    const wrap = document.createElement('div');
    wrap.className = 'arcpay-tip-wrap';
    wrap.appendChild(createTipButton(handle, tweetId));
    actionRow.appendChild(wrap);
    article.__arcpayInjected = true;
  }

  function scanAll() {
    document.querySelectorAll('article[data-testid="tweet"]').forEach(injectIntoArticle);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches('article[data-testid="tweet"]')) {
          injectIntoArticle(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('article[data-testid="tweet"]').forEach(injectIntoArticle);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  scanAll();

  // Handle SPA navigation on x.com
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(scanAll, 400);
    }
  }, 500);
})();
