import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAIN, ADDRESSES } from '@/lib/config';

const CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'https://arcpay.finance/api/auth/twitter/callback';
const SIGNER_PK = process.env.ATTESTATION_SIGNER_PK;
const BASE = 'https://arcpay.finance';

export const runtime = 'nodejs';

function back(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return NextResponse.redirect(`${BASE}/claim?${sp.toString()}`, 302);
}

export async function GET(request: Request) {
  if (!CLIENT_ID || !CLIENT_SECRET || !SIGNER_PK) {
    return back({ error: 'server_not_configured' });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const twitterError = url.searchParams.get('error');

  if (twitterError) return back({ error: twitterError });
  if (!code || !state) return back({ error: 'missing_code_or_state' });

  const store = cookies();
  const storedState = store.get('arcpay_state')?.value;
  const pkce = store.get('arcpay_pkce')?.value;
  const recipient = (store.get('arcpay_recipient')?.value || '').toLowerCase();

  if (!storedState || state !== storedState) return back({ error: 'state_mismatch' });
  if (!pkce) return back({ error: 'missing_pkce' });
  if (!/^0x[a-f0-9]{40}$/.test(recipient)) return back({ error: 'missing_recipient' });

  // Exchange code for access token
  let accessToken: string;
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK_URL,
      code_verifier: pkce,
    });
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body,
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return back({ error: 'token_exchange_failed', detail: detail.slice(0, 200) });
    }
    const j = await tokenRes.json();
    accessToken = j.access_token;
    if (!accessToken) return back({ error: 'no_access_token' });
  } catch (e: any) {
    return back({ error: 'token_exchange_exception', detail: String(e.message || e).slice(0, 200) });
  }

  // Fetch authenticated user
  let handle: string;
  try {
    const meRes = await fetch('https://api.twitter.com/2/users/me?user.fields=username', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      const detail = await meRes.text();
      return back({ error: 'me_fetch_failed', detail: detail.slice(0, 200) });
    }
    const j = await meRes.json();
    handle = (j?.data?.username || '').toLowerCase();
    if (!handle || !/^[a-z0-9_]{1,15}$/.test(handle)) {
      return back({ error: 'invalid_handle' });
    }
  } catch (e: any) {
    return back({ error: 'me_fetch_exception', detail: String(e.message || e).slice(0, 200) });
  }

  // Build & sign attestation
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  try {
    const messageHash = keccak256(
      encodePacked(
        ['string', 'uint256', 'address', 'string', 'address', 'uint256'],
        [
          'ArcPayHandleClaim',
          BigInt(CHAIN.id),
          ADDRESSES.tipJarByHandle as `0x${string}`,
          handle,
          recipient as `0x${string}`,
          BigInt(deadline),
        ],
      ),
    );
    const account = privateKeyToAccount(SIGNER_PK as `0x${string}`);
    const signature = await account.signMessage({ message: { raw: messageHash } });

    // Clear one-shot cookies
    store.delete('arcpay_state');
    store.delete('arcpay_pkce');
    store.delete('arcpay_recipient');

    return back({
      handle,
      recipient,
      deadline: String(deadline),
      signature,
    });
  } catch (e: any) {
    return back({ error: 'sign_exception', detail: String(e.message || e).slice(0, 200) });
  }
}
