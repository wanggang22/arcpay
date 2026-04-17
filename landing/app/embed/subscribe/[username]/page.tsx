import { formatUnits, createPublicClient, http, keccak256, stringToBytes } from 'viem';
import { ADDRESSES, CHAIN, subscriptionsAbi, registryAbi } from '@/lib/config';

export const revalidate = 60;

async function loadCreator(username: string) {
  try {
    const client = createPublicClient({ chain: CHAIN, transport: http() });
    const exists = (await client.readContract({
      address: ADDRESSES.registry, abi: registryAbi, functionName: 'exists', args: [username],
    })) as boolean;
    const creator = exists
      ? ((await client.readContract({
          address: ADDRESSES.registry, abi: registryAbi, functionName: 'getCreator', args: [username],
        }).catch(() => null)) as any)
      : null;
    return { exists, creator };
  } catch {
    return { exists: false, creator: null };
  }
}

async function loadPlans(username: string) {
  try {
    const client = createPublicClient({ chain: CHAIN, transport: http() });
    const hash = keccak256(stringToBytes(username));
    const out: Array<{ id: number; name: string; price: bigint }> = [];
    for (let i = 0; i < 20; i++) {
      try {
        const p: any = await client.readContract({
          address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
          functionName: 'getPlan', args: [BigInt(i)],
        });
        if (p.creatorHash === hash && p.active) {
          out.push({ id: i, name: p.name, price: p.pricePerMonth });
        }
      } catch {
        break;
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function loadXProfile(handle: string) {
  if (!process.env.TWITTER_BEARER_TOKEN) return null;
  try {
    const res = await fetch(`https://api.twitter.com/2/users/by/username/${handle}?user.fields=profile_image_url,name`, {
      headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.data;
    if (!user) return null;
    return {
      name: user.name as string,
      avatar: ((user.profile_image_url as string) || '').replace('_normal.', '_400x400.'),
    };
  } catch { return null; }
}

export default async function EmbedSubscribe({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { theme?: string };
}) {
  const username = params.username.toLowerCase();
  const [{ exists, creator }, plans, xProfile] = await Promise.all([
    loadCreator(username),
    loadPlans(username),
    loadXProfile(username),
  ]);

  const theme = searchParams.theme === 'dark' ? 'dark' : 'light';
  const bg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const subtle = theme === 'dark' ? 'text-gray-300' : 'text-gray-500';
  const border = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';

  const displayName = (creator?.displayName as string) || xProfile?.name || username;
  const avatar = xProfile?.avatar;
  const subscribeUrl = `https://arcpay.finance/${username}?tab=subscribe&src=embed`;

  return (
    <div className={`min-h-screen ${bg} p-4 flex items-start justify-center`}>
      <div className={`w-full max-w-sm rounded-2xl border ${border} p-5 shadow-sm`}>
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={displayName} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-base truncate">{displayName}</div>
            <div className={`text-xs ${subtle} font-mono`}>@{username}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-gray-400">Subscribe</div>
            <div className="text-[10px] font-bold">Arc · USDC</div>
          </div>
        </div>

        {!exists ? (
          <div className={`mt-4 text-sm ${subtle}`}>
            @{username} hasn&apos;t claimed ArcPay yet.{' '}
            <a href={`https://arcpay.finance/${username}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">Claim it →</a>
          </div>
        ) : plans.length === 0 ? (
          <div className={`mt-4 text-sm ${subtle}`}>
            @{username} hasn&apos;t created any subscription plans yet.
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {plans.map((p) => (
                <a
                  key={p.id}
                  href={`${subscribeUrl}&plan=${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block rounded-xl border ${border} p-3 hover:border-indigo-400 transition`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      <div className={`text-xs ${subtle}`}>billed in USDC</div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-bold">${formatUnits(p.price, 18)}</div>
                      <div className={`text-xs ${subtle}`}>/ month</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <a
              href={subscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full py-2.5 rounded-xl text-white text-center text-sm font-bold bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-400 hover:opacity-90 transition"
            >
              📅 Subscribe with USDC
            </a>

            <div className={`mt-3 text-[10px] text-center ${subtle}`}>
              Powered by{' '}
              <a href="https://arcpay.finance" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-500">
                ArcPay
              </a>{' '}
              · pay-per-second accrual · cancel any time for prorated refund
            </div>
          </>
        )}
      </div>
    </div>
  );
}
