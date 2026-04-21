import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ArcPayClient } from '@wanggang22/arcpay-sdk';
dotenv.config();

const NETWORK = process.env.ARCPAY_NETWORK || 'local';
const CREATOR = process.env.CREATOR_USERNAME;
const ENDPOINT = process.env.ENDPOINT_NAME;
const PORT = process.env.PORT || 3402;

if (!CREATOR || !ENDPOINT) throw new Error('Set CREATOR_USERNAME + ENDPOINT_NAME in .env');

const client = new ArcPayClient({ network: NETWORK });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const ep = await client.api.getEndpointByName(CREATOR, ENDPOINT);
  res.json({
    network: NETWORK,
    creator: CREATOR,
    endpoint: ENDPOINT,
    price: ep.pricePerCall.toString(),
    totalCalls: Number(ep.totalCalls),
    active: ep.active,
  });
});

// Verify on-chain payment, then serve the response
app.post('/call', async (req, res) => {
  const { callId, input } = req.body;
  if (callId === undefined) return res.status(400).json({ error: 'missing callId' });

  const receipt = await client.api.getReceipt(BigInt(callId));
  if (receipt.callId === 0n && callId !== 0) {
    return res.status(402).json({ error: 'payment not found; call PayPerCall.pay() first' });
  }

  // TODO: add your paid logic here
  const result = { echo: input, processedAt: new Date().toISOString() };
  res.json({ result, receipt: { callId: receipt.callId.toString(), payer: receipt.payer } });
});

app.listen(PORT, () => console.log(`Paid API running on :${PORT}`));
