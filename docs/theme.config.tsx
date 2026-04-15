import React from 'react';

export default {
  logo: (
    <span>
      <strong>ArcPay</strong>{' '}
      <span style={{ color: '#888', fontSize: '0.9em' }}>docs</span>
    </span>
  ),
  project: {
    link: 'https://github.com/wanggang22/arcpay',
  },
  docsRepositoryBase: 'https://github.com/wanggang22/arcpay/tree/master/docs',
  footer: {
    content: 'ArcPay · MIT License · Built on Arc Network',
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="ArcPay Docs" />
      <meta property="og:description" content="USDC payments on Arc — tips, subscriptions, paywalls, pay-per-call." />
    </>
  ),
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
};
