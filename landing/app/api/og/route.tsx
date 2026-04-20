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
          justifyContent: 'space-between',
          background: '#f7f4ee',
          color: '#0a0a0f',
          fontFamily: 'system-ui, sans-serif',
          padding: '70px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 28, fontWeight: 700 }}>
          <div style={{ color: '#2d4a3e', fontSize: 36 }}>⚡</div>
          ArcPay
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 20,
              fontSize: 112,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            <span>arcpay.finance/</span>
            <span style={{ color: '#2d4a3e', fontStyle: 'italic', fontWeight: 500 }}>@{username}</span>
          </div>
          <div style={{ fontSize: 34, color: 'rgba(10,10,15,0.6)', maxWidth: 1000, lineHeight: 1.3 }}>
            Tip with USDC on Arc. 2% fee · 0.5s settlement · for humans and AI agents.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            fontFamily: 'monospace',
            color: 'rgba(10,10,15,0.5)',
          }}
        >
          <div style={{ display: 'flex', gap: 14 }}>
            <span
              style={{
                padding: '8px 16px',
                border: '1px solid rgba(10,10,15,0.15)',
                borderRadius: 999,
                color: '#0a0a0f',
              }}
            >
              {initial}
            </span>
            <span style={{ padding: '8px 16px' }}>Tips</span>
            <span style={{ padding: '8px 16px' }}>Subs</span>
            <span style={{ padding: '8px 16px' }}>Paywall</span>
            <span style={{ padding: '8px 16px' }}>x402</span>
          </div>
          <div>The Stripe of USDC on Arc.</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
