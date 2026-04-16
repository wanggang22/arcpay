/*! ArcPay X extension — injects a 💸 Tip button under every tweet. */
(function () {
  'use strict';
  const BASE = 'https://arcpay.finance';

  // Pull tweet handle from the username link inside a tweet <article>.
  function extractHandle(article) {
    try {
      // Primary path: User-Name testid group
      const candidates = article.querySelectorAll('[data-testid="User-Name"] a[role="link"][href^="/"]');
      for (const a of candidates) {
        const href = a.getAttribute('href') || '';
        const parts = href.split('/').filter(Boolean);
        if (parts.length === 1 && /^[A-Za-z0-9_]{1,15}$/.test(parts[0])) {
          return parts[0].toLowerCase();
        }
      }
      // Fallback: any direct link like /username
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
      const params = new URLSearchParams({ src: 'x-ext' });
      if (tweetId) params.set('ref', tweetId);
      const url = `${BASE}/${encodeURIComponent(handle)}?${params.toString()}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    return btn;
  }

  function injectIntoArticle(article) {
    if (!article || article.__arcpayInjected) return;
    // Skip promoted/ads — they usually don't have a simple /handle link
    const handle = extractHandle(article);
    if (!handle) return;
    const tweetId = extractTweetId(article);

    // The action row is a role="group" with reply/retweet/like buttons
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

  // Initial pass + retry after SPA navigation
  scanAll();
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(scanAll, 400);
    }
  }, 500);
})();
