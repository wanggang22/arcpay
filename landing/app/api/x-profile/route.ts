import { NextResponse } from 'next/server';

export const revalidate = 3600;

const BEARER = process.env.TWITTER_BEARER_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = (searchParams.get('handle') || '').replace(/^@/, '').trim();

  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }

  if (!BEARER) {
    return NextResponse.json({ error: 'Twitter bearer not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}?user.fields=profile_image_url,name,description,verified`,
      {
        headers: { Authorization: `Bearer ${BEARER}` },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Twitter API error', status: res.status }, { status: res.status });
    }

    const data = await res.json();
    if (!data.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = data.data;
    const avatar = (user.profile_image_url || '').replace('_normal.', '_400x400.');

    return NextResponse.json(
      {
        handle: user.username,
        name: user.name,
        description: user.description,
        avatar,
        verified: user.verified ?? false,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fetch failed' }, { status: 500 });
  }
}
