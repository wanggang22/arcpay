'use client';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { useAccount, useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits, keccak256, stringToBytes } from 'viem';
import { ADDRESSES, subscriptionsFullAbi, registryAbi } from '@/lib/config';

export default function SubsPage() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [username, setUsername] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: hashes } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getUsernamesByAddress',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: name } = useReadContract({
    address: ADDRESSES.registry, abi: registryAbi, functionName: 'getNameByHash',
    args: hashes && hashes.length > 0 ? [hashes[0]] : undefined, query: { enabled: !!hashes && hashes.length > 0 },
  });
  useEffect(() => { if (name) setUsername(name); }, [name]);

  const { data: claimable } = useReadContract({
    address: ADDRESSES.subscriptions, abi: subscriptionsFullAbi, functionName: 'claimableRevenue',
    args: username ? [username] : undefined, query: { enabled: !!username, refetchInterval: 5000 },
  });

  useEffect(() => {
    if (!pub || !username) return;
    const load = async () => {
      const found = [];
      const usernameHash = keccak256(stringToBytes(username));
      for (let i = 0; i < 50; i++) {
        try {
          const p: any = await pub.readContract({
            address: ADDRESSES.subscriptions, abi: subscriptionsFullAbi, functionName: 'getPlan', args: [BigInt(i)],
          });
          if (p.creatorHash === usernameHash) {
            const subs: any = await pub.readContract({
              address: ADDRESSES.subscriptions, abi: subscriptionsFullAbi, functionName: 'getPlanSubscribers', args: [BigInt(i)],
            });
            found.push({ id: i, ...p, subscriberCount: subs.length });
          }
        } catch { break; }
      }
      setPlans(found);
    };
    load();
  }, [pub, username]);

  const withdraw = async () => {
    if (!wallet || !pub || !username) return;
    setBusy(true);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.subscriptions, abi: subscriptionsFullAbi, functionName: 'withdraw', args: [username],
      });
      await pub.waitForTransactionReceipt({ hash });
    } finally { setBusy(false); }
  };

  if (!username) return <Shell><p className="text-muted">Register a username first.</p></Shell>;

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📅 Subscriptions</h1>
          <p className="text-muted text-sm mt-1">Recurring USDC plans for <span className="font-mono">@{username}</span></p>
        </div>
        <div className="flex items-center gap-3">
          {claimable !== undefined && claimable > 0n && (
            <button onClick={withdraw} disabled={busy}
              className="px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-60">
              {busy ? 'Withdrawing...' : `Withdraw ${formatUnits(claimable, 18)} USDC`}
            </button>
          )}
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-arc-gradient text-white font-semibold">
            + New plan
          </button>
        </div>
      </div>

      {showCreate && <CreatePlanForm username={username} onDone={() => setShowCreate(false)} />}

      <h2 className="text-lg font-bold mt-8 mb-3">Your plans ({plans.length})</h2>
      {plans.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-8 text-center text-muted">
          No plans yet. Create one to accept monthly subscriptions.
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(p => (
            <div key={p.id} className="bg-panel border border-border rounded-2xl p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{p.name}</div>
                  <div className="text-sm text-muted">Plan #{p.id} · {p.active ? '🟢 active' : '⚪ inactive'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">${formatUnits(p.pricePerMonth, 18)}<span className="text-sm text-muted"> /mo</span></div>
                  <div className="text-xs text-muted">{p.subscriberCount} subscriber{p.subscriberCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function CreatePlanForm({ username, onDone }: { username: string; onDone: () => void }) {
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0.005');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!wallet || !pub || !name) return;
    setBusy(true); setErr('');
    try {
      const metadataURI = desc ? `data:application/json,${encodeURIComponent(JSON.stringify({ description: desc }))}` : '';
      const hash = await wallet.writeContract({
        address: ADDRESSES.subscriptions, abi: subscriptionsFullAbi, functionName: 'createPlan',
        args: [username, name, parseUnits(price, 18), metadataURI],
      });
      await pub.waitForTransactionReceipt({ hash });
      onDone();
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-panel border border-border rounded-3xl p-6 mt-4">
      <h3 className="font-bold text-lg mb-4">Create subscription plan</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Plan name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Pro Tier" className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium">Price per month (USDC)</label>
          <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What subscribers get..."
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none resize-none h-20" />
        </div>
        {err && <div className="text-red-500 text-sm">{err}</div>}
        <div className="flex gap-2">
          <button onClick={submit} disabled={!name || busy}
            className="flex-1 py-3 rounded-xl bg-arc-gradient text-white font-bold disabled:opacity-50">
            {busy ? 'Creating...' : 'Create plan'}
          </button>
          <button onClick={onDone} className="px-4 py-3 rounded-xl border border-border">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
