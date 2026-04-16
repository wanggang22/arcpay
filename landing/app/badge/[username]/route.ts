import { formatUnits, createPublicClient, http } from 'viem';
import { ADDRESSES, CHAIN, tipJarAbi, registryAbi } from '@/lib/config';

export const revalidate = 60;

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function badge(label: string, value: string, color: string): string {
  const labelW = Math.max(60, label.length * 7 + 18);
  const valueW = Math.max(80, value.length * 7 + 18);
  const totalW = labelW + valueW;
  const labelText = escape(label);
  const valueText = escape(value);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="28" role="img" aria-label="${labelText}: ${valueText}">
  <title>${labelText}: ${valueText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".15"/>
    <stop offset="1" stop-opacity=".15"/>
  </linearGradient>
  <clipPath id="c"><rect width="${totalW}" height="28" rx="6" fill="#fff"/></clipPath>
  <g clip-path="url(#c)">
    <rect width="${labelW}" height="28" fill="#2b2b2b"/>
    <rect x="${labelW}" width="${valueW}" height="28" fill="${color}"/>
    <rect width="${totalW}" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="12">
    <text x="${labelW / 2}" y="19" fill="#000" fill-opacity="0.3">${labelText}</text>
    <text x="${labelW / 2}" y="18">${labelText}</text>
    <text x="${labelW + valueW / 2}" y="19" fill="#000" fill-opacity="0.3">${valueText}</text>
    <text x="${labelW + valueW / 2}" y="18">${valueText}</text>
  </g>
</svg>`;
}

export async function GET(_request: Request, { params }: { params: { username: string } }) {
  const rawUsername = params.username.replace(/\.svg$/i, '').toLowerCase();

  if (!/^[a-z0-9_-]{1,32}$/i.test(rawUsername)) {
    const svg = badge('arcpay', 'invalid username', '#c62828');
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml;charset=utf-8', 'Cache-Control': 'public, max-age=60' },
    });
  }

  try {
    const client = createPublicClient({ chain: CHAIN, transport: http() });
    const [exists, lifetime] = await Promise.all([
      client.readContract({ address: ADDRESSES.registry, abi: registryAbi, functionName: 'exists', args: [rawUsername] }).catch(() => false) as Promise<boolean>,
      client.readContract({ address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getLifetimeReceived', args: [rawUsername] }).catch(() => 0n) as Promise<bigint>,
    ]);

    if (!exists) {
      const svg = badge(`arcpay`, `@${rawUsername} not claimed`, '#9e9e9e');
      return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml;charset=utf-8', 'Cache-Control': 'public, max-age=300' },
      });
    }

    const usdc = Number(formatUnits(lifetime, 18));
    const valueLabel = usdc > 0 ? `${usdc.toFixed(4)} USDC · on Arc` : `tip · on Arc`;
    const svg = badge(`💸 tip @${rawUsername}`, valueLabel, '#6366f1');

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml;charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    const svg = badge('arcpay', 'error', '#c62828');
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml;charset=utf-8', 'Cache-Control': 'public, max-age=30' },
    });
  }
}
