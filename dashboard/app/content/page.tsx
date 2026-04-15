'use client';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { useAccount, useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits, keccak256, stringToBytes, toHex } from 'viem';
import { ADDRESSES, contentPaywallFullAbi, registryAbi } from '@/lib/config';

export default function ContentPage() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [username, setUsername] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
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
    address: ADDRESSES.contentPaywall, abi: contentPaywallFullAbi, functionName: 'claimableRevenue',
    args: username ? [username] : undefined, query: { enabled: !!username, refetchInterval: 5000 },
  });
  const { data: ids } = useReadContract({
    address: ADDRESSES.contentPaywall, abi: contentPaywallFullAbi, functionName: 'getCreatorContents',
    args: username ? [username] : undefined, query: { enabled: !!username, refetchInterval: 5000 },
  });

  useEffect(() => {
    if (!pub || !ids) return;
    const load = async () => {
      const out = [];
      for (const id of ids) {
        const c: any = await pub.readContract({
          address: ADDRESSES.contentPaywall, abi: contentPaywallFullAbi, functionName: 'getContent', args: [id],
        });
        out.push({ id, ...c });
      }
      setItems(out.reverse());
    };
    load();
  }, [pub, ids]);

  const withdraw = async () => {
    if (!wallet || !pub || !username) return;
    setBusy(true);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.contentPaywall, abi: contentPaywallFullAbi, functionName: 'withdraw', args: [username],
      });
      await pub.waitForTransactionReceipt({ hash });
    } finally { setBusy(false); }
  };

  if (!username) return <Shell><p className="text-muted">Register a username first.</p></Shell>;

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🔒 Paywalled Content</h1>
          <p className="text-muted text-sm mt-1">Gate articles, videos, courses</p>
        </div>
        <div className="flex items-center gap-3">
          {claimable !== undefined && claimable > 0n && (
            <button onClick={withdraw} disabled={busy}
              className="px-4 py-2 rounded-xl bg-green-500 text-white font-semibold disabled:opacity-60">
              {busy ? 'Withdrawing...' : `Withdraw ${formatUnits(claimable, 18)} USDC`}
            </button>
          )}
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-arc-gradient text-white font-semibold">
            + Add content
          </button>
        </div>
      </div>

      {showCreate && <CreateContentForm username={username} onDone={() => setShowCreate(false)} />}

      <h2 className="text-lg font-bold mt-8 mb-3">Your content ({items.length})</h2>
      {items.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-8 text-center text-muted">
          No paywalled content yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            let meta: any = {};
            try {
              if (item.metadataURI?.startsWith('data:application/json,')) {
                meta = JSON.parse(decodeURIComponent(item.metadataURI.slice('data:application/json,'.length)));
              }
            } catch {}
            return (
              <div key={item.id} className="bg-panel border border-border rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{meta.title || 'Untitled'}</div>
                    <div className="text-sm text-muted font-mono truncate">{item.id}</div>
                    {meta.description && <div className="text-sm text-muted mt-1">{meta.description}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">${formatUnits(item.price, 18)}</div>
                    <div className="text-xs text-muted">{Number(item.totalSales)} sales</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function CreateContentForm({ username, onDone }: { username: string; onDone: () => void }) {
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('0.01');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!wallet || !pub || !title) return;
    setBusy(true); setErr('');
    try {
      const contentId = keccak256(stringToBytes(`${username}:${title}:${Date.now()}`));
      const metadata = { title, description: desc, url };
      const metadataURI = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
      const hash = await wallet.writeContract({
        address: ADDRESSES.contentPaywall, abi: contentPaywallFullAbi, functionName: 'createContent',
        args: [username, contentId, parseUnits(price, 18), metadataURI],
      });
      await pub.waitForTransactionReceipt({ hash });
      onDone();
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-panel border border-border rounded-3xl p-6 mt-4">
      <h3 className="font-bold text-lg mb-4">Add paywalled content</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="My premium article" className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium">Price (USDC)</label>
          <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium">Content URL (optional)</label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://... or ipfs://..." className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What buyers get..."
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none resize-none h-20" />
        </div>
        {err && <div className="text-red-500 text-sm">{err}</div>}
        <div className="flex gap-2">
          <button onClick={submit} disabled={!title || busy}
            className="flex-1 py-3 rounded-xl bg-arc-gradient text-white font-bold disabled:opacity-50">
            {busy ? 'Creating...' : 'Create content'}
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
