import React from 'react';

export default {
  logo: (
    <span className="arcpay-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#2d4a3e', fontSize: '1.1em', lineHeight: 1 }}>⚡</span>
      <strong>ArcPay</strong>
      <span style={{ color: 'rgba(10,10,15,0.5)', fontSize: '0.85em' }}>docs</span>
    </span>
  ),
  project: {
    link: 'https://github.com/wanggang22/arcpay',
  },
  chat: {
    link: 'https://arcpay.finance',
    icon: (
      <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>arcpay.finance →</span>
    ),
  },
  docsRepositoryBase: 'https://github.com/wanggang22/arcpay/tree/master/docs',
  footer: {
    content: (
      <span style={{ fontSize: '0.85em' }}>
        ArcPay · MIT · Built on <a href="https://arc.network" target="_blank" rel="noopener">Arc Network</a>
      </span>
    ),
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="ArcPay Docs" />
      <meta property="og:description" content="USDC payments on Arc — tips, subscriptions, paywalls, pay-per-call. For humans and AI agents." />
      <meta property="og:image" content="https://arcpay.finance/api/og?username=docs" />
      <link rel="icon" href="https://arcpay.finance/favicon.ico" />
    </>
  ),
  primaryHue: { light: 156, dark: 156 },
  primarySaturation: { light: 27, dark: 32 },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  darkMode: true,
};
