/*! ArcPay Embed SDK v0.1 — https://arcpay.finance/embed.js
 * Usage:
 *   <script src="https://arcpay.finance/embed.js" defer></script>
 *   <div data-arcpay="tip" data-user="gavin" data-theme="dark" data-amount="0.05"></div>
 *
 * Button mode:
 *   <button data-arcpay-button data-user="gavin">Tip me</button>
 */
(function () {
  'use strict';
  var BASE = 'https://arcpay.finance';

  function qs(params) {
    return Object.keys(params)
      .filter(function (k) { return params[k]; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
  }

  function renderInline(el) {
    var user = el.getAttribute('data-user');
    if (!user) return;
    var theme = el.getAttribute('data-theme') || '';
    var amount = el.getAttribute('data-amount') || '';
    var query = qs({ theme: theme, amount: amount });
    var src = BASE + '/embed/tip/' + encodeURIComponent(user) + (query ? '?' + query : '');
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.border = '0';
    iframe.style.width = '100%';
    iframe.style.maxWidth = '420px';
    iframe.style.height = '320px';
    iframe.style.display = 'block';
    iframe.setAttribute('title', 'ArcPay · Tip @' + user);
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allowtransparency', 'true');
    el.innerHTML = '';
    el.appendChild(iframe);
  }

  function openModal(user, theme, amount) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2147483647;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;max-width:440px;width:92%;';

    var iframe = document.createElement('iframe');
    iframe.src = BASE + '/embed/tip/' + encodeURIComponent(user) + (qs({ theme: theme, amount: amount }) ? '?' + qs({ theme: theme, amount: amount }) : '');
    iframe.style.cssText = 'width:100%;height:380px;border:0;border-radius:16px;background:white;';
    iframe.setAttribute('title', 'ArcPay · Tip @' + user);

    var close = document.createElement('button');
    close.innerHTML = '✕';
    close.style.cssText = 'position:absolute;top:-36px;right:0;width:28px;height:28px;border-radius:14px;border:0;background:white;cursor:pointer;font-size:14px;line-height:1;';
    close.setAttribute('aria-label', 'Close');

    function dismiss() { document.body.removeChild(overlay); }
    close.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', esc); }
    });

    wrapper.appendChild(iframe);
    wrapper.appendChild(close);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);
  }

  function wireButtons() {
    var btns = document.querySelectorAll('[data-arcpay-button]');
    btns.forEach(function (b) {
      if (b.__arcpayWired) return;
      b.__arcpayWired = true;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var user = b.getAttribute('data-user');
        if (!user) return;
        openModal(user, b.getAttribute('data-theme') || '', b.getAttribute('data-amount') || '');
      });
    });
  }

  function renderAll() {
    document.querySelectorAll('[data-arcpay="tip"]').forEach(renderInline);
    wireButtons();
  }

  // Expose small programmatic API
  window.ArcPay = {
    open: openModal,
    render: renderAll,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();
