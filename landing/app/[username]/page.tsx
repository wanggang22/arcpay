'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAccount, useConnect, useDisconnect, useReadContract, usePublicClient, useWalletClient, useBalance } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const PRIVY_APP_ID_ENV = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const HAS_PRIVY_BTN = PRIVY_APP_ID_ENV.length >= 20 && !PRIVY_APP_ID_ENV.includes('demo') && !PRIVY_APP_ID_ENV.includes('replace');
import { formatUnits, parseUnits, keccak256, stringToBytes } from 'viem';
import Link from 'next/link';
import { ADDRESSES, registryAbi, tipJarAbi, tipJarByHandleAbi, subscriptionsAbi, contentPaywallAbi, payPerCallAbi } from '@/lib/config';
import { TxLink, AddressLink } from '@/components/TxLink';

type Tab = 'tip' | 'subscribe' | 'content' | 'api';

export default function CreatorPage() {
  const params = useParams();
  const sp = useSearchParams();
  const username = params.username as string;

  const initialTab = ((): Tab => {
    const t = sp.get('tab');
    if (t === 'subscribe' || t === 'content' || t === 'api' || t === 'tip') return t;
    return 'tip';
  })();
  const [tab, setTab] = useState<Tab>(initialTab);

  const { data: exists } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'exists', args: [username],
  });

  const { data: creator } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getCreator', args: [username],
    query: { enabled: !!exists },
  });

  const { data: lifetime } = useReadContract({
    address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getLifetimeReceived', args: [username],
    query: { enabled: !!exists, refetchInterval: 5000 },
  });

  if (exists === false) {
    return <HandleOnlyPage username={username} />;
  }

  const displayName = creator?.displayName || username;
  let bio = '';
  try {
    if (creator?.metadataURI?.startsWith('data:application/json,')) {
      const decoded = decodeURIComponent(creator.metadataURI.slice('data:application/json,'.length));
      bio = JSON.parse(decoded).bio || '';
    }
  } catch {}

  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent" />
          <span className="font-bold">ArcPay</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/faucet"
            className="hidden sm:inline text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-accent transition"
            title="Get free testnet USDC">
            💧 Faucet
          </Link>
          <PrivyAuthButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-24 bg-accent" />
          <div className="px-6 pb-6 -mt-10">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-accent">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="mt-3">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <div className="text-gray-500 font-mono text-sm">@{username}</div>
              {bio && <p className="mt-3 text-gray-700">{bio}</p>}
              {lifetime !== undefined && lifetime > 0n && (
                <div className="mt-3 text-xs text-gray-500">
                  💸 Lifetime tips: {Number(formatUnits(lifetime, 18)).toFixed(4)} USDC
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100">
            <div className="grid grid-cols-4 border-b border-gray-100">
              {(['tip', 'subscribe', 'content', 'api'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`py-3 text-sm font-semibold ${tab === t ? 'text-accent border-b-2 border-accent' : 'text-gray-500'}`}>
                  {t === 'tip' ? '💸 Tip' : t === 'subscribe' ? '📅 Subscribe' : t === 'content' ? '🔒 Content' : '⚡ API'}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === 'tip' && <TipForm username={username} />}
              {tab === 'subscribe' && <SubscribePanel username={username} />}
              {tab === 'content' && <ContentList username={username} />}
              {tab === 'api' && <ApiList username={username} />}
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-gray-400">
          Powered by <Link href="/" className="font-semibold hover:text-gray-700">ArcPay</Link> on Arc Network · USDC native
        </div>
      </main>
    </div>
  );
}

// ─── Wallet Badge + Auth Button ───────────────────────────────

function WalletBadge({ address }: { address: string }) {
  const { data: bal } = useBalance({ address: address as `0x${string}` });
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-accent transition"
      title="Click to copy full address">
      <span className="text-xs font-mono text-gray-700">{copied ? '✓ Copied!' : short}</span>
      {bal && (
        <span className="text-xs font-semibold text-accent">
          {Number(formatUnits(bal.value, 18)).toFixed(3)} USDC
        </span>
      )}
    </button>
  );
}

function PrivyAuthButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  if (!ready) return <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm">Loading...</button>;
  if (!authenticated) return (
    <button onClick={() => login()} className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold">
      Sign in to pay
    </button>
  );
  const ident = identityFromPrivyUser(user);
  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {ident && <IdentityBadge ident={ident} />}
      {wallet && <WalletBadge address={wallet.address} />}
      <button onClick={() => logout()} className="px-2 py-1 rounded-md border border-gray-200 text-xs hover:bg-gray-50">
        Sign out
      </button>
    </div>
  );
}

type SocialIdent = {
  source: 'twitter' | 'google' | 'discord' | 'farcaster' | 'github' | 'email' | 'apple';
  label: string;
  avatar?: string;
};

function identityFromPrivyUser(user: any): SocialIdent | null {
  if (!user) return null;
  if (user.twitter?.username) {
    return {
      source: 'twitter',
      label: `@${user.twitter.username}`,
      avatar: user.twitter.profilePictureUrl,
    };
  }
  if (user.google?.email) {
    return { source: 'google', label: user.google.name || user.google.email };
  }
  if (user.discord?.username) {
    return { source: 'discord', label: user.discord.username };
  }
  if (user.farcaster?.username) {
    return { source: 'farcaster', label: `@${user.farcaster.username}`, avatar: user.farcaster.pfp };
  }
  if (user.github?.username) {
    return { source: 'github', label: user.github.username };
  }
  if (user.apple?.email) {
    return { source: 'apple', label: user.apple.email };
  }
  if (user.email?.address) {
    return { source: 'email', label: user.email.address };
  }
  return null;
}

function sourceEmoji(s: SocialIdent['source']): string {
  return ({
    twitter: '𝕏',
    google: 'G',
    discord: '💬',
    farcaster: 'ᶠ',
    github: '⌨',
    apple: '',
    email: '✉',
  } as Record<SocialIdent['source'], string>)[s] || '';
}

function IdentityBadge({ ident }: { ident: SocialIdent }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-gray-200 max-w-[180px]">
      {ident.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ident.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold">
          {sourceEmoji(ident.source)}
        </div>
      )}
      <span className="text-xs font-medium truncate" title={ident.label}>{ident.label}</span>
    </div>
  );
}

// ─── Tip Form ──────────────────────────────────────────────────

interface RecentTip { id: string; from: string; amount: bigint; message: string; timestamp: number }

function formatRelativeTime(ts: number): string {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TipForm({ username }: { username: string }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [amount, setAmount] = useState('0.005');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [myStats, setMyStats] = useState<{ count: number; total: bigint } | null>(null);
  const [recentTips, setRecentTips] = useState<RecentTip[]>([]);

  useEffect(() => {
    if (!pub) return;
    const loadRecent = async () => {
      try {
        const [ids, bps] = await Promise.all([
          pub.readContract({
            address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getTipsByCreator', args: [username],
          }) as Promise<bigint[]>,
          pub.readContract({
            address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'protocolFeeBps', args: [],
          }) as Promise<bigint>,
        ]);
        const last10 = [...(ids as bigint[])].slice(-10).reverse();
        const tips = await Promise.all(last10.map(async (id) => {
          try {
            const t: any = await pub.readContract({
              address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getTip', args: [id],
            });
            const net = t.amount as bigint;
            const gross = bps < 10000n ? (net * 10000n) / (10000n - bps) : net;
            return {
              id: id.toString(),
              from: t.from as string,
              amount: gross,
              message: t.message as string,
              timestamp: Number(t.timestamp),
            } as RecentTip;
          } catch {
            return null;
          }
        }));
        setRecentTips(tips.filter((t): t is RecentTip => t !== null));
      } catch {}
    };
    loadRecent();
  }, [pub, username, tx]);

  useEffect(() => {
    if (!pub || !address) { setMyStats(null); return; }
    const load = async () => {
      try {
        const usernameHash = keccak256(stringToBytes(username));
        const [ids, bps] = await Promise.all([
          pub.readContract({
            address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getTipsByFan', args: [address],
          }) as Promise<bigint[]>,
          pub.readContract({
            address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'protocolFeeBps', args: [],
          }) as Promise<bigint>,
        ]);
        let count = 0; let netTotal = 0n;
        await Promise.all(ids.map(async (id) => {
          try {
            const t: any = await pub.readContract({
              address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'getTip', args: [id],
            });
            if (t.usernameHash === usernameHash) { count++; netTotal += t.amount as bigint; }
          } catch {}
        }));
        // Fan paid gross = net * 10000 / (10000 - bps)
        const gross = bps < 10000n ? (netTotal * 10000n) / (10000n - bps) : netTotal;
        setMyStats({ count, total: gross });
      } catch {}
    };
    load();
  }, [pub, address, username, tx]);

  const send = async () => {
    if (!wallet || !address || !pub) return;
    setBusy(true); setErr(''); setTx(null);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'tip',
        args: [username, message], value: parseUnits(amount, 18),
        gas: 300000n,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash); setMessage('');
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  const presets = ['0.001', '0.005', '0.01', '0.05'];

  return (
    <div>
      {myStats && myStats.count > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          💸 You've tipped @{username} <strong>{myStats.count}</strong> time{myStats.count !== 1 ? 's' : ''} · <strong>{Number(formatUnits(myStats.total, 18)).toFixed(4)} USDC</strong>
        </div>
      )}

      {recentTips.length > 0 && (
        <div className="mb-4 border border-gray-100 rounded-xl bg-gray-50/60 p-3">
          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
            🎉 Recent supporters · {recentTips.length}
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {recentTips.map((t) => {
              const short = `${t.from.slice(0, 6)}...${t.from.slice(-4)}`;
              const seed = t.from.slice(2, 4);
              const hue = (parseInt(seed, 16) * 137) % 360;
              return (
                <div key={t.id} className="flex items-start gap-2 text-xs">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                    style={{ background: `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${(hue+60)%360},70%,60%))` }}
                  >
                    {seed.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-mono text-gray-600">{short}</span>
                      <span className="font-bold text-accent">{Number(formatUnits(t.amount, 18)).toFixed(4)} USDC</span>
                      {t.timestamp > 0 && <span className="text-gray-400 text-[10px]">· {formatRelativeTime(t.timestamp)}</span>}
                    </div>
                    {t.message && <div className="text-gray-700 italic mt-0.5 truncate" title={t.message}>"{t.message}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600 mb-3">Support @{username} with a USDC tip</div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {presets.map(p => (
          <button key={p} onClick={() => setAmount(p)}
            className={`py-2 rounded-xl text-sm font-semibold border-2 transition
              ${amount === p ? 'border-accent bg-accent/10 text-accent' : 'border-gray-200'}`}>
            ${p}
          </button>
        ))}
      </div>
      <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:outline-none mb-3" placeholder="Custom amount" inputMode="decimal" />
      <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 280))}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:outline-none resize-none h-20 mb-3" placeholder="Message (optional)" />

      {!address ? (
        <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">Connect wallet to send tip</div>
      ) : (
        <button onClick={send} disabled={busy || !amount}
          className="w-full py-3 rounded-xl font-bold text-white bg-accent disabled:opacity-60">
          {busy ? 'Sending...' : `Send $${amount} tip`}
        </button>
      )}

      {tx && <div className="mt-3 text-green-600 text-sm bg-green-50 p-3 rounded-xl text-center">
        ✓ Tip sent! <TxLink tx={tx} />
      </div>}
      {err && <div className="mt-3 text-red-500 text-sm bg-red-50 p-2 rounded-xl">{err}</div>}
    </div>
  );
}

function SubscribePanel({ username }: { username: string }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price: bigint; active: boolean }>>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [months, setMonths] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [myActive, setMyActive] = useState<{ planId: number; planName: string; paidUntil: number; subId: bigint; startedAt: number } | null>(null);

  useEffect(() => {
    if (!pub) return;
    const load = async () => {
      setLoadingPlans(true);
      const found: Array<{ id: number; name: string; price: bigint; active: boolean }> = [];
      const usernameHash = keccak256(stringToBytes(username));
      for (let i = 0; i < 20; i++) {
        try {
          const p: any = await pub.readContract({
            address: ADDRESSES.subscriptions, abi: subscriptionsAbi, functionName: 'getPlan', args: [BigInt(i)],
          });
          if (p.creatorHash === usernameHash) {
            found.push({ id: i, name: p.name, price: p.pricePerMonth, active: p.active });
          }
        } catch { break; }
      }
      setPlans(found);
      setLoadingPlans(false);
      if (found[0]) setSelectedPlan(found[0].id);

      // Check if current wallet has an active sub to any of these plans
      if (address) {
        for (const plan of found) {
          try {
            const slot: any = await pub.readContract({
              address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
              functionName: 'activeSubOf', args: [address, BigInt(plan.id)],
            });
            if (slot > 0n) {
              const sub: any = await pub.readContract({
                address: ADDRESSES.subscriptions, abi: subscriptionsAbi,
                functionName: 'getSubscription', args: [slot - 1n],
              });
              const paidUntil = Number(sub.paidUntil);
              const startedAt = Number(sub.startedAt);
              if (sub.active && paidUntil * 1000 > Date.now()) {
                setMyActive({ planId: plan.id, planName: plan.name, paidUntil, subId: slot - 1n, startedAt });
                return;
              }
            }
          } catch {}
        }
        setMyActive(null);
      }
    };
    load();
  }, [pub, username, address, tx]);

  const subscribe = async () => {
    if (!wallet || !address || !pub || selectedPlan === null) return;
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;
    setBusy(true); setErr(''); setTx(null);
    try {
      const total = plan.price * BigInt(months);
      const hash = await wallet.writeContract({
        address: ADDRESSES.subscriptions, abi: subscriptionsAbi, functionName: 'subscribe',
        args: [BigInt(selectedPlan), BigInt(months)], value: total,
        gas: 400000n,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash);
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  const cancelSub = async () => {
    if (!wallet || !pub || !myActive) return;
    const confirmed = confirm(
      `Cancel subscription to "${myActive.planName}"?\n\n` +
      `You'll get a prorated refund for the unused portion (contract computes this automatically). ` +
      `You can re-subscribe anytime.`
    );
    if (!confirmed) return;
    setBusy(true); setErr(''); setTx(null);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.subscriptions, abi: subscriptionsAbi, functionName: 'cancel',
        args: [myActive.subId],
        gas: 300000n,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash);
      setMyActive(null);
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  if (loadingPlans) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
          <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
          <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-1/4 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }
  if (plans.length === 0) {
    return (
      <div className="text-center py-10 px-6 border-2 border-dashed border-gray-200 rounded-2xl">
        <div className="text-4xl mb-2">📅</div>
        <div className="font-bold">@{username} hasn&apos;t created a subscription plan yet.</div>
        <div className="text-sm text-gray-500 mt-1">Tips and content may still be available in the other tabs.</div>
      </div>
    );
  }

  return (
    <div>
      {myActive && (
        <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            ✓ Active subscription: <strong>{myActive.planName}</strong> · valid until <strong>{new Date(myActive.paidUntil * 1000).toLocaleDateString()}</strong>
          </div>
          <button
            onClick={cancelSub}
            disabled={busy}
            className="shrink-0 px-2.5 py-1 rounded-lg border border-blue-300 hover:bg-blue-100 text-[11px] font-bold disabled:opacity-60"
            title="Cancel and refund the unused portion">
            Cancel &amp; refund
          </button>
        </div>
      )}
      <div className="text-sm text-gray-600 mb-3">Subscribe to @{username}</div>
      <div className="space-y-2 mb-4">
        {plans.filter(p => p.active).map(p => (
          <button key={p.id} onClick={() => setSelectedPlan(p.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition
              ${selectedPlan === p.id ? 'border-accent bg-accent/5' : 'border-gray-200'}`}>
            <div className="font-bold">{p.name}</div>
            <div className="text-sm text-gray-600">${formatUnits(p.price, 18)} / month</div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-gray-600">Duration:</label>
        {[1, 3, 6, 12].map(n => (
          <button key={n} onClick={() => setMonths(n)}
            className={`px-3 py-1 rounded-full text-sm ${months === n ? 'bg-accent text-white' : 'bg-gray-100'}`}>
            {n}mo
          </button>
        ))}
      </div>
      {selectedPlan !== null && plans.find(p => p.id === selectedPlan) && (
        <div className="text-sm text-gray-600 mb-3">
          Total: <span className="font-bold text-black">${formatUnits((plans.find(p => p.id === selectedPlan)!.price * BigInt(months)), 18)} USDC</span>
        </div>
      )}
      {!address ? (
        <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">Connect wallet to subscribe</div>
      ) : (
        <button onClick={subscribe} disabled={busy || selectedPlan === null}
          className="w-full py-3 rounded-xl font-bold text-white bg-accent disabled:opacity-60">
          {busy ? 'Subscribing...' : 'Subscribe'}
        </button>
      )}
      {tx && <div className="mt-3 text-green-600 text-sm bg-green-50 p-3 rounded-xl text-center">✓ Subscribed!</div>}
      {err && <div className="mt-3 text-red-500 text-sm bg-red-50 p-2 rounded-xl">{err}</div>}
    </div>
  );
}

function ContentList({ username }: { username: string }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [items, setItems] = useState<any[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!pub) return;
    const load = async () => {
      try {
        const ids: any = await pub.readContract({
          address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
          functionName: 'getCreatorContents', args: [username],
        });
        const out: any[] = [];
        for (const id of ids) {
          const c: any = await pub.readContract({
            address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
            functionName: 'getContent', args: [id],
          });
          out.push({ id, ...c });
        }
        setItems(out);

        // Check access for current wallet
        if (address) {
          const accessChecks = await Promise.all(out.map(async (item) => {
            try {
              const has: any = await pub.readContract({
                address: ADDRESSES.contentPaywall, abi: contentPaywallAbi,
                functionName: 'checkAccess', args: [item.id, address],
              });
              return [item.id as string, Boolean(has)] as const;
            } catch { return [item.id as string, false] as const; }
          }));
          setAccessMap(Object.fromEntries(accessChecks));
        }
      } catch {}
    };
    load();
  }, [pub, username, address, busy]);

  const buy = async (id: string, price: bigint) => {
    if (!wallet || !pub) return;
    setBusy(id); setErr('');
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.contentPaywall, abi: contentPaywallAbi, functionName: 'purchase',
        args: [id as `0x${string}`], value: price,
        gas: 300000n,
      });
      await pub.waitForTransactionReceipt({ hash });
      setAccessMap(prev => ({ ...prev, [id]: true }));
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(null); }
  };

  if (items.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-sm">No paywalled content yet.</div>;
  }

  const activeItems = items.filter(i => i.active);
  const unlockedCount = activeItems.filter(i => accessMap[i.id]).length;

  return (
    <div>
      {address && unlockedCount > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-purple-50 border border-purple-200 text-sm text-purple-800">
          🔓 You've unlocked <strong>{unlockedCount}</strong> of <strong>{activeItems.length}</strong> item{activeItems.length !== 1 ? 's' : ''} from @{username}
        </div>
      )}
      <div className="text-sm text-gray-600 mb-3">Premium content from @{username}</div>
      <div className="space-y-3">
        {activeItems.map(item => {
          let meta: any = {};
          try {
            if (item.metadataURI?.startsWith('data:application/json,')) {
              meta = JSON.parse(decodeURIComponent(item.metadataURI.slice('data:application/json,'.length)));
            }
          } catch {}
          const unlocked = accessMap[item.id];
          return (
            <div key={item.id} className={`p-4 rounded-xl border ${unlocked ? 'border-green-300 bg-green-50/50' : 'border-gray-200'}`}>
              <div className="font-bold">{meta.title || item.id.slice(0, 10) + '...'}</div>
              {meta.description && <div className="text-sm text-gray-600 mt-1">{meta.description}</div>}
              {unlocked && meta.url && (
                <a href={meta.url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-accent hover:text-accent/80 underline">
                  🔓 Open content ↗
                </a>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm font-bold">${formatUnits(item.price, 18)}</div>
                {unlocked ? (
                  <div className="px-4 py-1.5 bg-green-500 text-white rounded-full text-sm font-semibold">
                    ✓ Unlocked
                  </div>
                ) : address ? (
                  <button onClick={() => buy(item.id, item.price)} disabled={busy === item.id}
                    className="px-4 py-1.5 bg-accent text-white rounded-full text-sm font-semibold disabled:opacity-60">
                    {busy === item.id ? 'Buying...' : 'Unlock'}
                  </button>
                ) : (
                  <div className="text-xs text-gray-500">Connect wallet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {err && <div className="mt-3 text-red-500 text-sm bg-red-50 p-2 rounded-xl">{err}</div>}
    </div>
  );
}

function ApiList({ username }: { username: string }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [lastBatch, setLastBatch] = useState<{ callIds: string[]; txs: string[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!pub) return;
    const load = async () => {
      try {
        const ids: any = await pub.readContract({
          address: ADDRESSES.payPerCall, abi: payPerCallAbi,
          functionName: 'getCreatorEndpoints', args: [username],
        });
        const out: any[] = [];
        for (const id of ids) {
          const e: any = await pub.readContract({
            address: ADDRESSES.payPerCall, abi: payPerCallAbi,
            functionName: 'getEndpoint', args: [id],
          });
          out.push({ id, ...e });
        }
        setItems(out);
      } catch {}
    };
    load();
  }, [pub, username, lastBatch]);

  const payN = async (id: string, price: bigint, count: number) => {
    if (!wallet || !pub || count < 1) return;
    setBusy(id); setErr(''); setLastBatch(null);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.payPerCall, abi: payPerCallAbi,
        functionName: 'batchPay', args: [id as `0x${string}`, BigInt(count)],
        value: price * BigInt(count),
        gas: 400000n,
      });
      const receipt = await pub.waitForTransactionReceipt({ hash });
      const paidLogs = receipt.logs.filter(l => l.address.toLowerCase() === ADDRESSES.payPerCall.toLowerCase());
      const callIds = paidLogs.map(l => l.topics[1] ? (BigInt(l.topics[1]) + 1n).toString() : '?');
      setLastBatch({ callIds, txs: [hash] });
    } catch (e: any) {
      setErr(e.shortMessage || e.message);
    }
    finally { setBusy(null); }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const activeItems = items.filter(i => i.active);

  if (activeItems.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-sm">@{username} hasn't registered any paid API endpoints yet.</div>;
  }

  return (
    <div>
      <div className="text-xs text-gray-600 mb-3 bg-amber-50 border border-amber-200 rounded-lg p-2">
        ⚡ <strong>For developers & AI agents.</strong> Pay-per-call endpoints are designed for programmatic access via the ArcPay SDK.
      </div>
      <div className="space-y-3">
        {activeItems.map(item => {
          const qty = qtyMap[item.id] ?? 1;
          const total = item.pricePerCall * BigInt(qty);
          return (
            <div key={item.id} className="p-4 rounded-xl border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-bold font-mono">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Number(item.totalCalls)} total calls served
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-bold">${formatUnits(item.pricePerCall, 18)}</div>
                  <div className="text-xs text-gray-500">/ call</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 text-xs font-mono text-gray-500 truncate" title={item.id}>
                  {item.id.slice(0, 14)}...{item.id.slice(-6)}
                </div>
                <button onClick={() => copyToClipboard(item.id, item.id)}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50"
                  title="Copy endpointId">
                  {copied === item.id ? '✓' : '📋'}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-gray-500">Calls:</label>
                {[1, 5, 10, 50].map(n => (
                  <button key={n} onClick={() => setQtyMap(m => ({ ...m, [item.id]: n }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition
                      ${qty === n ? 'bg-accent text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {n}
                  </button>
                ))}
                <input type="number" min={1} value={qty}
                  onChange={e => setQtyMap(m => ({ ...m, [item.id]: Math.max(1, parseInt(e.target.value || '1')) }))}
                  className="w-16 px-2 py-1 rounded-md border border-gray-200 text-xs" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total: <span className="font-bold text-black">${formatUnits(total, 18)} USDC</span>
                </div>
                {address ? (
                  <button onClick={() => payN(item.id, item.pricePerCall, qty)} disabled={busy === item.id}
                    className="px-4 py-1.5 bg-accent text-white rounded-full text-sm font-semibold disabled:opacity-60">
                    {busy === item.id
                      ? 'Paying...'
                      : qty === 1 ? 'Pay for 1 call' : `Pay for ${qty} calls`}
                  </button>
                ) : (
                  <div className="text-xs text-gray-500">Connect wallet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lastBatch && lastBatch.callIds.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200">
          <div className="text-sm font-bold text-green-800">
            ✓ Purchased {lastBatch.callIds.length} call credit{lastBatch.callIds.length !== 1 ? 's' : ''} · receipt{lastBatch.callIds.length !== 1 ? 's' : ''} #{lastBatch.callIds[0]}{lastBatch.callIds.length > 1 ? `–#${lastBatch.callIds[lastBatch.callIds.length - 1]}` : ''}
          </div>
          <div className="text-xs mt-1"><TxLink tx={lastBatch.txs[0]} /></div>
          <div className="text-xs text-green-700 mt-2">
            Credits are bound to your wallet address. Your app / AI agent must sign each request with the same wallet — the <Link href="/" className="underline">ArcPay SDK</Link> handles signing automatically.
          </div>
        </div>
      )}
      {err && <div className="mt-3 text-red-500 text-sm bg-red-50 p-2 rounded-xl">{err}</div>}
    </div>
  );
}

// ─── Handle-only page (for unregistered X handles) ────────────

function HandleOnlyPage({ username }: { username: string }) {
  const [xProfile, setXProfile] = useState<{ name: string; avatar: string; description?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/x-profile?handle=${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && !d.error) setXProfile(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [username]);

  const displayName = xProfile?.name || username;
  const bio = xProfile?.description;

  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent" />
          <span className="font-bold">ArcPay</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/faucet"
            className="hidden sm:inline text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-accent transition"
            title="Get free testnet USDC">
            💧 Faucet
          </Link>
          <PrivyAuthButton />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-6 pt-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-24 bg-accent" />
          <div className="px-6 pb-6 -mt-10">
            {xProfile?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={xProfile.avatar}
                alt={displayName}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-accent">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="mt-3">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <a href={`https://x.com/${username}`} target="_blank" rel="noopener noreferrer"
                className="text-gray-500 font-mono text-sm hover:text-accent">
                @{username} ↗
              </a>
              {bio && <p className="mt-3 text-gray-700 text-sm">{bio}</p>}
              <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
                ⏳ @{username} hasn&apos;t claimed ArcPay yet. Tips are safely held on-chain.
                They can{' '}
                <Link href="/claim" className="font-bold underline">claim via X OAuth</Link> any time.
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 p-6">
            <HandleTipForm username={username} />
          </div>
        </div>
        <div className="text-center mt-6 text-xs text-gray-400">
          Powered by <Link href="/" className="font-semibold hover:text-gray-700">ArcPay</Link> on Arc Network · USDC native
        </div>
      </main>
    </div>
  );
}

function HandleTipForm({ username }: { username: string }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [amount, setAmount] = useState('0.005');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [available, setAvailable] = useState<bigint | null>(null);

  useEffect(() => {
    if (!pub) return;
    (async () => {
      try {
        const amt = await pub.readContract({
          address: ADDRESSES.tipJarByHandle, abi: tipJarByHandleAbi,
          functionName: 'availableToClaim', args: [username],
        }) as bigint;
        setAvailable(amt);
      } catch {}
    })();
  }, [pub, username, tx]);

  const send = async () => {
    if (!wallet || !address || !pub) return;
    setBusy(true); setErr(''); setTx(null);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.tipJarByHandle, abi: tipJarByHandleAbi,
        functionName: 'tipByHandle',
        args: [username, message], value: parseUnits(amount, 18),
        gas: 350000n,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash); setMessage('');
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  const presets = ['0.001', '0.005', '0.01', '0.05'];

  return (
    <div>
      <div className="text-sm text-gray-600 mb-2">
        Support @{username} with a USDC tip — held on-chain until they claim.
      </div>
      {available !== null && available > 0n && (
        <div className="mb-3 text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg p-2">
          💸 Pending for @{username}: <strong>{Number(formatUnits(available, 18)).toFixed(4)} USDC</strong>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {presets.map(p => (
          <button key={p} onClick={() => setAmount(p)}
            className={`py-2 rounded-xl text-sm font-semibold border-2 transition
              ${amount === p ? 'border-accent bg-accent/10 text-accent' : 'border-gray-200'}`}>
            ${p}
          </button>
        ))}
      </div>
      <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:outline-none mb-3" placeholder="Custom amount" inputMode="decimal" />
      <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 280))}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:outline-none resize-none h-20 mb-3" placeholder="Message (optional)" />

      {!address ? (
        <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">Connect wallet or sign in to tip</div>
      ) : (
        <button onClick={send} disabled={busy || !amount}
          className="w-full py-3 rounded-xl font-bold text-white bg-accent disabled:opacity-60">
          {busy ? 'Sending...' : `Send $${amount} tip`}
        </button>
      )}

      {tx && (
        <div className="mt-3 text-green-600 text-sm bg-green-50 p-3 rounded-xl text-center">
          ✓ Tip sent! It&apos;s held for @{username} until they claim. <TxLink tx={tx} />
        </div>
      )}
      {err && <div className="mt-3 text-red-500 text-sm bg-red-50 p-2 rounded-xl">{err}</div>}
    </div>
  );
}
