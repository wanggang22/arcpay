// Example autonomous agent that pays for API calls on Arc
import dotenv from 'dotenv';
import { ArcPayClient, formatUnits } from '@arcpay/sdk';
dotenv.config();

const client = new ArcPayClient({
  network: process.env.ARCPAY_NETWORK || 'local',
  privateKey: process.env.PRIVATE_KEY,
});

async function main() {
  const provider = process.env.PROVIDER_USERNAME;
  const endpoint = process.env.ENDPOINT_NAME;

  console.log(`Agent wallet: ${client.account.address}`);
  const ep = await client.api.getEndpointByName(provider, endpoint);
  console.log(`Endpoint ${endpoint} @ ${provider}: ${formatUnits(ep.pricePerCall, 18)} USDC/call`);

  console.log('Paying for 1 call...');
  const txHash = await client.api.pay(provider, endpoint, ep.pricePerCall);
  console.log(`Paid tx: ${txHash}`);

  // TODO: call the provider's off-chain endpoint with the callId
  console.log('Agent flow complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
