import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = (searchParams.get('username') || 'creator').replace(/^@/, '').slice(0, 30);
  const initial = username.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: 60,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 72,
              fontWeight: 800,
              border: '6px solid white',
            }}
          >
            {initial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1 }}>@{username}</div>
            <div style={{ fontSize: 40, opacity: 0.9, marginTop: 16 }}>Tip with USDC on Arc</div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 70,
            padding: '16px 32px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 24,
            fontSize: 32,
          }}
        >
          💸 · 📅 · 🔒 · ⚡ · arcpay.finance/{username}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
