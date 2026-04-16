import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';

const CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'https://arcpay.finance/api/auth/twitter/callback';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'TWITTER_CLIENT_ID not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const recipient = (url.searchParams.get('recipient') || '').toLowerCase();

  if (!/^0x[a-f0-9]{40}$/.test(recipient)) {
    return NextResponse.redirect(
      new URL('/claim?error=missing_recipient', request.url).toString(),
      302,
    );
  }

  const codeVerifier = randomBytes(64).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state = randomBytes(32).toString('base64url');

  const store = cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  };
  store.set('arcpay_pkce', codeVerifier, cookieOpts);
  store.set('arcpay_state', state, cookieOpts);
  store.set('arcpay_recipient', recipient, cookieOpts);

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('scope', 'users.read tweet.read offline.access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(authUrl.toString(), 302);
}
