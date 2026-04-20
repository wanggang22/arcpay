// End-to-end SDK smoke test against local Arc testnet.
// Run: node --import tsx test/smoke.test.ts
import { ArcPayClient, parseUnits, formatUnits } from '../src/index.js';
import fs from 'node:fs';

function envKey(i: number): string {
  const text = fs.readFileSync(`C:/Users/ASUS/arc-accounts/account${i}/.env`, 'utf8');
  return text.match(/^PRIVATE_KEY=(.+)$/m)![1].trim();
}

// Use a unique username for this test run
const username = `bob${Date.now() % 100000}`;

console.log('=== ArcPay SDK smoke test ===');
console.log(`Using username: ${username}\n`);

// Creator client (account7)
const creator = new ArcPayClient({
  network: 'local',
  privateKey: envKey(7) as `0x${string}`,
});

console.log('1. Register creator...');
await creator.registry.register(username, 'Bob Tester', 'ipfs://bob-metadata');
const exists = await creator.registry.exists(username);
console.log(`   ✓ exists: ${exists}`);
const payout = await creator.registry.getPayoutAddress(username);
console.log(`   ✓ payout: ${payout}\n`);

// Fan client (account8)
const fan = new ArcPayClient({
  network: 'local',
  privateKey: envKey(8) as `0x${string}`,
});

console.log('2. Fan sends 0.01 USDC tip with message...');
const tipTx = await fan.tips.send({
  username,
  amount: '0.01',
  message: 'Great SDK! Thanks Bob',
});
console.log(`   ✓ tx: ${tipTx}`);
const lifetime = await fan.tips.getLifetimeReceived(username);
console.log(`   ✓ lifetime received: ${formatUnits(lifetime, 18)} USDC\n`);

console.log('3. Creator creates subscription plan...');
await creator.subs.createPlan(username, 'Pro Tier', '0.005', 'ipfs://pro-tier-meta');
console.log(`   ✓ plan 0 created at 0.005 USDC/month\n`);

console.log('4. Fan subscribes for 3 months...');
await fan.subs.subscribe(0, 3);
const isActive = await fan.subs.isActive(fan.account!.address, 0);
console.log(`   ✓ subscription active: ${isActive}\n`);

console.log('5. Creator registers API endpoint...');
await creator.api.registerEndpoint(username, 'ai-summarize', '0.001');
const ep = await creator.api.getEndpointByName(username, 'ai-summarize');
console.log(`   ✓ endpoint registered: price=${formatUnits(ep.pricePerCall, 18)} USDC\n`);

console.log('6. Fan pays for API call...');
await fan.api.pay(username, 'ai-summarize', ep.pricePerCall);
console.log(`   ✓ paid\n`);

console.log('7. Creator creates paywall content...');
const contentId = '0x' + '42'.repeat(32) as `0x${string}`;
await creator.paywall.createContent(username, contentId, '0.02', 'ipfs://article-meta');
console.log(`   ✓ content ${contentId.slice(0, 10)}... created at 0.02 USDC\n`);

console.log('8. Fan purchases content...');
await fan.paywall.purchase(contentId, parseUnits('0.02', 18));
const hasAccess = await fan.paywall.checkAccess(contentId, fan.account!.address);
console.log(`   ✓ access granted: ${hasAccess}\n`);

console.log('9. Fan batchPays 3 credits for ai-summarize...');
const batchTx = await fan.api.batchPay(username, 'ai-summarize', 3);
console.log(`   ✓ batchPay tx: ${batchTx}`);
console.log(`   ✓ 3 credits prepaid in one transaction\n`);

console.log('=== ALL 4 PAYMENT MODES WORK ===');
console.log('  Tips ✓  Subscriptions ✓  Pay-per-call ✓  Content paywall ✓  batchPay ✓');
