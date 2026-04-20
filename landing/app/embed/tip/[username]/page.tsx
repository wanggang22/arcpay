import { formatUnits, createPublicClient, http, keccak256, stringToBytes } from 'viem';
import { ADDRESSES, CHAIN, tipJarAbi, registryAbi } from '@/lib/config';

export const revalidate = 60;

async function loadCreator(username: string) {
  try {
    const client = createPublicClient({ chain: CHAIN, transport: http() });
    const [exists, creator, lifetime, tipIds] = await Promise.all([
      client.readContract({ address: ADDRESSES.registry, abi: registryAbi, functionName: 'exists', args: [username] }) as Promise<boolean>,
      client.readContract({ address: ADDRESSES.registry, abi: registryAbi, functionName: 'getCreator', args: [username] }).catch(() => null) as Promise<any>,
      client.readContract({ address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getLifetimeReceived', args: [username] }).catch(() => 0n) as Promise<bigint>,
      client.readContract({ address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getTipsByCreator', args: [username] }).catch(() => []) as Promise<bigint[]>,
    ]);
    return { exists, creator, lifetime, tipCount: (tipIds || []).length };
  } catch {
    return { exists: false, creator: null, lifetime: 0n, tipCount: 0 };
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

export default async function EmbedTip({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { theme?: string; amount?: string };
}) {
  const username = params.username.toLowerCase();
  const { exists, creator, lifetime, tipCount } = await loadCreator(username);
  const xProfile = await loadXProfile(username);

  const theme = searchParams.theme === 'dark' ? 'dark' : 'light';
  const presetAmount = searchParams.amount || '0.01';
  const displayName = (creator?.displayName as string) || xProfile?.name || username;
  const avatar = xProfile?.avatar;
  const bg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const subtle = theme === 'dark' ? 'text-gray-300' : 'text-gray-500';
  const border = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';

  const tipUrl = `https://arcpay.finance/${username}?amount=${presetAmount}&src=embed`;

  return (
    <div className={`min-h-screen ${bg} p-4 flex items-start justify-center`}>
      <div className={`w-full max-w-sm rounded-2xl border ${border} p-5 shadow-sm`}>
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={displayName} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-base truncate">{displayName}</div>
            <div className={`text-xs ${subtle} font-mono`}>@{username}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-gray-400">on Arc</div>
            <div className="text-[10px] font-bold">USDC</div>
          </div>
        </div>

        {!exists ? (
          <div className={`mt-4 text-sm ${subtle}`}>
            @{username} hasn&apos;t claimed this handle on ArcPay yet.{' '}
            <a href={`https://arcpay.finance/${username}`} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Claim it →
            </a>
          </div>
        ) : (
          <>
            <div className={`mt-3 text-xs ${subtle} flex items-center gap-3`}>
              {lifetime > 0n && (
                <span>💸 Received <strong className="text-accent">{Number(formatUnits(lifetime, 18)).toFixed(4)} USDC</strong></span>
              )}
              {tipCount > 0 && <span>· {tipCount} tip{tipCount !== 1 ? 's' : ''}</span>}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {['0.005', '0.01', '0.05', '0.1'].map((amt) => (
                <a
                  key={amt}
                  href={`https://arcpay.finance/${username}?amount=${amt}&src=embed`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-1.5 rounded-lg border ${border} text-center text-xs font-semibold hover:border-accent hover:text-accent transition`}
                >
                  ${amt}
                </a>
              ))}
            </div>

            <a
              href={tipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-full py-2.5 rounded-xl text-white text-center text-sm font-bold bg-accent hover:opacity-90 transition"
            >
              💸 Tip with USDC
            </a>

            <div className={`mt-3 text-[10px] text-center ${subtle}`}>
              Powered by{' '}
              <a href="https://arcpay.finance" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
                ArcPay
              </a>{' '}
              · instant, 2% fee, native USDC
            </div>
          </>
        )}
      </div>
    </div>
  );
}
