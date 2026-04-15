'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { formatUnits, parseUnits, keccak256, stringToBytes } from 'viem';
import Link from 'next/link';
import { ADDRESSES, registryAbi, tipJarAbi, subscriptionsAbi, contentPaywallAbi } from '@/lib/config';

type Tab = 'tip' | 'subscribe' | 'content';

export default function CreatorPage() {
  const params = useParams();
  const username = params.username as string;

  const [tab, setTab] = useState<Tab>('tip');

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
    return (
      <main className="max-w-lg mx-auto p-6 pt-20 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-2xl font-bold">@{username} hasn't claimed this handle yet</h1>
        <p className="text-gray-600 mt-3">
          Is this you? <Link href="/dashboard" className="text-indigo-600 font-semibold">Claim it →</Link>
        </p>
        <Link href="/" className="inline-block mt-8 text-sm text-gray-500 hover:text-gray-900">← Back to arcpay.io</Link>
      </main>
    );
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      <header className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-arc-gradient" />
          <span className="font-bold">ArcPay</span>
        </Link>
        <PrivyAuthButton />
      </header>

      <main className="max-w-lg mx-auto px-6 pt-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-24 bg-arc-gradient" />
          <div className="px-6 pb-6 -mt-10">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-indigo-600">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="mt-3">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <div className="text-gray-500 font-mono text-sm">@{username}</div>
              {bio && <p className="mt-3 text-gray-700">{bio}</p>}
              {lifetime !== undefined && lifetime > 0n && (
                <div className="mt-3 text-xs text-gray-500">
                  Lifetime received: {Number(formatUnits(lifetime, 18)).toFixed(4)} USDC
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100">
            <div className="grid grid-cols-3 border-b border-gray-100">
              {(['tip', 'subscribe', 'content'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`py-3 text-sm font-semibold ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
                  {t === 'tip' ? '💸 Tip' : t === 'subscribe' ? '📅 Subscribe' : '🔒 Content'}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === 'tip' && <TipForm username={username} />}
              {tab === 'subscribe' && <SubscribePanel username={username} />}
              {tab === 'content' && <ContentList username={username} />}
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

// ─── Privy auth button ─────────────────────────────────────────

function PrivyAuthButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  if (!ready) return <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm">Loading...</button>;
  if (!authenticated) return (
    <button onClick={login} className="px-4 py-2 rounded-xl bg-arc-gradient text-white text-sm font-semibold">
      Sign in to pay
    </button>
  );
  const label = user?.email?.address ?? user?.google?.email
    ?? (user?.wallet ? `${user.wallet.address.slice(0,6)}...${user.wallet.address.slice(-4)}` : 'You');
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 truncate max-w-[120px]">{label}</span>
      <button onClick={logout} className="px-2 py-1 rounded-md border border-gray-200 text-xs hover:bg-gray-50">
        Sign out
      </button>
    </div>
  );
}

// ─── Tip Form ──────────────────────────────────────────────────

function TipForm({ username }: { username: string }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [amount, setAmount] = useState('0.005');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const send = async () => {
    if (!wallet || !address || !pub) return;
    setBusy(true); setErr(''); setTx(null);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'tip',
        args: [username, message], value: parseUnits(amount, 18),
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash); setMessage('');
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  const presets = ['0.001', '0.005', '0.01', '0.05'];

  return (
    <div>
      <div className="text-sm text-gray-600 mb-3">Support @{username} with a USDC tip</div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {presets.map(p => (
          <button key={p} onClick={() => setAmount(p)}
            className={`py-2 rounded-xl text-sm font-semibold border-2 transition
              ${amount === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200'}`}>
            ${p}
          </button>
        ))}
      </div>
      <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:outline-none mb-3" placeholder="Custom amount" inputMode="decimal" />
      <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 280))}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:outline-none resize-none h-20 mb-3" placeholder="Message (optional)" />

      {!address ? (
        <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">Connect wallet to send tip</div>
      ) : (
        <button onClick={send} disabled={busy || !amount}
          className="w-full py-3 rounded-xl font-bold text-white bg-arc-gradient disabled:opacity-60">
          {busy ? 'Sending...' : `Send $${amount} tip`}
        </button>
      )}

      {tx && <div className="mt-3 text-green-600 text-sm bg-green-50 p-3 rounded-xl text-center">
        ✓ Tip sent! <span className="font-mono text-xs">{tx.slice(0, 10)}...{tx.slice(-6)}</span>
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
  const [months, setMonths] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!pub) return;
    const load = async () => {
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
      if (found[0]) setSelectedPlan(found[0].id);
    };
    load();
  }, [pub, username]);

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
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash);
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  if (plans.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-sm">@{username} hasn't created any subscription plans yet.</div>;
  }

  return (
    <div>
      <div className="text-sm text-gray-600 mb-3">Subscribe to @{username}</div>
      <div className="space-y-2 mb-4">
        {plans.filter(p => p.active).map(p => (
          <button key={p.id} onClick={() => setSelectedPlan(p.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition
              ${selectedPlan === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
            <div className="font-bold">{p.name}</div>
            <div className="text-sm text-gray-600">${formatUnits(p.price, 18)} / month</div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-gray-600">Duration:</label>
        {[1, 3, 6, 12].map(n => (
          <button key={n} onClick={() => setMonths(n)}
            className={`px-3 py-1 rounded-full text-sm ${months === n ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
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
          className="w-full py-3 rounded-xl font-bold text-white bg-arc-gradient disabled:opacity-60">
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
      } catch {}
    };
    load();
  }, [pub, username]);

  const buy = async (id: string, price: bigint) => {
    if (!wallet || !pub) return;
    setBusy(id); setErr('');
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.contentPaywall, abi: contentPaywallAbi, functionName: 'purchase',
        args: [id as `0x${string}`], value: price,
      });
      await pub.waitForTransactionReceipt({ hash });
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(null); }
  };

  if (items.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-sm">No paywalled content yet.</div>;
  }

  return (
    <div>
      <div className="text-sm text-gray-600 mb-3">Premium content from @{username}</div>
      <div className="space-y-3">
        {items.filter(i => i.active).map(item => {
          let meta: any = {};
          try {
            if (item.metadataURI?.startsWith('data:application/json,')) {
              meta = JSON.parse(decodeURIComponent(item.metadataURI.slice('data:application/json,'.length)));
            }
          } catch {}
          return (
            <div key={item.id} className="p-4 rounded-xl border border-gray-200">
              <div className="font-bold">{meta.title || item.id.slice(0, 10) + '...'}</div>
              {meta.description && <div className="text-sm text-gray-600 mt-1">{meta.description}</div>}
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm font-bold">${formatUnits(item.price, 18)}</div>
                {address ? (
                  <button onClick={() => buy(item.id, item.price)} disabled={busy === item.id}
                    className="px-4 py-1.5 bg-arc-gradient text-white rounded-full text-sm font-semibold disabled:opacity-60">
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
