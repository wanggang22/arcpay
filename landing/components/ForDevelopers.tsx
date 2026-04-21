'use client';
import { CodeTabs } from './CodeTabs';

export function ForDevelopers() {
  const tabs = [
    {
      label: 'JS / TypeScript',
      code: `$ pnpm add @wanggang22/arcpay-sdk

import { ArcPayClient } from '@wanggang22/arcpay-sdk';
const client = new ArcPayClient({ network: 'testnet' });

// AI agent prepays 100 inference credits in one tx
await client.api.batchPay('gavin', 'summarize-paper', 100);

// Each subsequent call spends one credit:
//   const sig = await wallet.signMessage('arcpay-call:' + callId);
//   fetch(endpointUrl, { method: 'POST', body: JSON.stringify({
//     callId, signature: sig, endpointId, input,
//   }) });`,
    },
    {
      label: 'Python',
      code: `$ pip install git+https://github.com/wanggang22/arcpay.git#subdirectory=sdk/python

from arcpay import ArcPayClient
client = ArcPayClient(network='testnet')

client.tips.send(
    username='gavin',
    amount='0.01',
    message='great post',
)`,
    },
    {
      label: 'x402 curl',
      code: `# Real endpoint: landing/app/api/demo-translate/route.ts
$ curl -X POST https://arcpay.finance/api/demo-translate \\
    -H "Content-Type: application/json" \\
    -d '{"callId":"12","signature":"0xa3f1...","text":"Hola","endpointId":"0x8f3a..."}'

→ 200 OK
{
  "ok": true,
  "message": "x402 verified · credit consumed",
  "translation": "Hello",
  "callId": "12"
}`,
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 md:py-36 border-t border-hairline">
      <div className="max-w-xl mb-12">
        <div className="font-mono text-xs text-accent tracking-wider mb-3">FOR DEVELOPERS</div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-ink">
          One SDK. Every mode. Real code.
        </h2>
      </div>
      <CodeTabs tabs={tabs} />
      <div className="flex flex-wrap gap-3 mt-8 font-mono text-xs text-ink/60">
        <span className="px-3 py-1.5 rounded-md border border-hairline">create-arcpay v0.1.2</span>
        <span className="px-3 py-1.5 rounded-md border border-hairline">@wanggang22/arcpay-sdk v0.1.1</span>
        <span className="px-3 py-1.5 rounded-md border border-hairline">python arcpay · git</span>
        <a
          href="https://github.com/wanggang22/arcpay"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-md border border-hairline hover:bg-ink/5 transition"
        >
          github.com/wanggang22/arcpay
        </a>
      </div>
    </section>
  );
}
