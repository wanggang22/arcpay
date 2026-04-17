import { NextResponse } from 'next/server';
import { createPublicClient, http, verifyMessage } from 'viem';
import { ADDRESSES, CHAIN, payPerCallAbi } from '@/lib/config';

// In-memory "consumed" set. Lost on cold start — fine for demo.
// In production you'd use Redis / Postgres.
const consumed = new Set<string>();

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { callId, signature, text, endpointId } = body || {};

    if (!callId || !signature || !text || !endpointId) {
      return NextResponse.json(
        { error: 'Missing required fields: callId, signature, text, endpointId' },
        { status: 400 }
      );
    }

    // 402 — payment required: callId already consumed
    if (consumed.has(String(callId))) {
      return NextResponse.json(
        { error: 'This callId was already consumed.', code: 'already_consumed', callId },
        { status: 402 }
      );
    }

    // Read the on-chain receipt
    const client = createPublicClient({ chain: CHAIN, transport: http() });
    let receipt: any;
    try {
      receipt = await client.readContract({
        address: ADDRESSES.payPerCall,
        abi: payPerCallAbi,
        functionName: 'getReceipt',
        args: [BigInt(callId)],
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Failed to read receipt from chain', detail: e.message },
        { status: 502 }
      );
    }

    if (!receipt || receipt.payer === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'callId not found on-chain', code: 'no_receipt', callId },
        { status: 402 }
      );
    }

    // Endpoint must match (prevents using a credit from endpoint X for endpoint Y)
    if ((receipt.endpointId as string).toLowerCase() !== String(endpointId).toLowerCase()) {
      return NextResponse.json(
        { error: 'callId was issued for a different endpoint', code: 'endpoint_mismatch', callId },
        { status: 402 }
      );
    }

    // Verify the client's signature matches the on-chain payer
    const message = `arcpay-call:${callId}`;
    let sigValid = false;
    try {
      sigValid = await verifyMessage({
        address: receipt.payer as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch {}

    if (!sigValid) {
      return NextResponse.json(
        { error: 'Invalid signature — only the payer of this callId can consume it', code: 'bad_sig' },
        { status: 402 }
      );
    }

    // All checks passed — mark consumed, do the work
    consumed.add(String(callId));

    const translated = mockTranslate(String(text));

    return NextResponse.json({
      ok: true,
      input: text,
      translated,
      callId: String(callId),
      payer: receipt.payer,
      amountPaid: String(receipt.amount),
      timestamp: Number(receipt.timestamp),
      verified: true,
      message: 'x402 verified · credit consumed',
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

/** Deterministic pseudo-translation for demo purposes.
 *  Matches common phrases; falls back to a quirky mock. */
function mockTranslate(text: string): string {
  const phrases: Array<[RegExp, string]> = [
    [/^hello$/i, '你好'],
    [/^hello world$/i, '你好世界'],
    [/^how are you\??$/i, '你好吗？'],
    [/^good morning!?$/i, '早上好！'],
    [/^good night!?$/i, '晚安！'],
    [/^thank you\.?$/i, '谢谢。'],
    [/^sorry\.?$/i, '对不起。'],
    [/^i love you\.?$/i, '我爱你。'],
    [/^yes\.?$/i, '是的。'],
    [/^no\.?$/i, '不。'],
    [/^please$/i, '请'],
    [/^welcome$/i, '欢迎'],
    [/^goodbye$/i, '再见'],
    [/^what'?s your name\??$/i, '你叫什么名字？'],
    [/^my name is (.+)$/i, '我叫 $1'],
    [/^i am (.+)$/i, '我是 $1'],
  ];
  const trimmed = text.trim();
  for (const [re, zh] of phrases) {
    if (re.test(trimmed)) return trimmed.replace(re, zh);
  }
  // Fallback: pseudo word-level "translation" — just keeps the shape
  const words = trimmed.split(/\s+/);
  if (words.length <= 3) return `${trimmed} → (demo) ${words.join('・')}的意思`;
  return `(demo mock) "${trimmed}" translated as: ${words.map((w, i) => (i % 2 ? '中文' : w)).join(' ')}`;
}
