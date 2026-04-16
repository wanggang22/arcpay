'use client';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { useAccount, useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { ADDRESSES, payPerCallFullAbi, registryAbi } from '@/lib/config';

export default function APIPage() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [username, setUsername] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
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
    address: ADDRESSES.payPerCall, abi: payPerCallFullAbi, functionName: 'claimableRevenue',
    args: username ? [username] : undefined, query: { enabled: !!username, refetchInterval: 5000 },
  });
  const { data: ids } = useReadContract({
    address: ADDRESSES.payPerCall, abi: payPerCallFullAbi, functionName: 'getCreatorEndpoints',
    args: username ? [username] : undefined, query: { enabled: !!username, refetchInterval: 5000 },
  });

  useEffect(() => {
    if (!pub || !ids) return;
    const load = async () => {
      const out = [];
      for (const id of ids) {
        const e: any = await pub.readContract({
          address: ADDRESSES.payPerCall, abi: payPerCallFullAbi, functionName: 'getEndpoint', args: [id],
        });
        out.push({ id, ...e });
      }
      setEndpoints(out.reverse());
    };
    load();
  }, [pub, ids]);

  const withdraw = async () => {
    if (!wallet || !pub || !username) return;
    setBusy(true);
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.payPerCall, abi: payPerCallFullAbi, functionName: 'withdraw', args: [username],
      });
      await pub.waitForTransactionReceipt({ hash });
    } finally { setBusy(false); }
  };

  if (!username) return <Shell><p className="text-muted">Register a username first.</p></Shell>;

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">⚡ Paid API Endpoints</h1>
          <p className="text-muted text-sm mt-1">x402-compatible pay-per-call billing</p>
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
            + New endpoint
          </button>
        </div>
      </div>

      {showCreate && <CreateEndpointForm username={username} onDone={() => setShowCreate(false)} />}

      <h2 className="text-lg font-bold mt-8 mb-3">Your endpoints ({endpoints.length})</h2>
      {endpoints.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-8 text-center text-muted">
          No endpoints yet. Register one to charge per API call.
        </div>
      ) : (
        <div className="space-y-2">
          {endpoints.map(e => (
            <div key={e.id} className="bg-panel border border-border rounded-2xl p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-bold font-mono">{e.name}</div>
                  <div className="text-xs text-muted mt-1">{e.active ? '🟢 active' : '⚪ inactive'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">${formatUnits(e.pricePerCall, 18)}<span className="text-sm text-muted"> /call</span></div>
                  <div className="text-xs text-muted">{Number(e.totalCalls)} calls · {formatUnits(e.totalRevenue, 18)} gross</div>
                </div>
              </div>
              <EndpointIdBox id={e.id} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-arc-gradient text-white p-6 rounded-3xl">
        <div className="font-bold">Share with your API clients</div>
        <p className="text-xs opacity-80 mt-1">
          Copy this snippet to your API docs so developers and AI agents can integrate billing.
        </p>
        <pre className="mt-3 text-xs bg-black/20 p-3 rounded-lg overflow-x-auto">{`import { ArcPayClient } from '@arcpay/sdk';

const client = new ArcPayClient({
  network: 'testnet',
  privateKey: process.env.CLIENT_PK, // your AI agent's wallet
});

// Option A — pay per call
await client.api.pay('${username}', '${endpoints[0]?.name || 'my-api'}');

// Option B — prepay 100 calls in one tx
await client.api.batchPay('${username}', '${endpoints[0]?.name || 'my-api'}', 100);

// Each request: SDK auto-signs with your wallet.
// Server verifies the signature matches the on-chain payer.
const result = await client.api.call('${username}', '${endpoints[0]?.name || 'my-api'}', {
  prompt: 'hello',
});`}</pre>
      </div>
    </Shell>
  );
}

function CreateEndpointForm({ username, onDone }: { username: string; onDone: () => void }) {
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0.001');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!wallet || !pub || !name) return;
    setBusy(true); setErr('');
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.payPerCall, abi: payPerCallFullAbi, functionName: 'registerEndpoint',
        args: [username, name, parseUnits(price, 18)],
      });
      await pub.waitForTransactionReceipt({ hash });
      onDone();
    } catch (e: any) { setErr(e.shortMessage || e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-panel border border-border rounded-3xl p-6 mt-4">
      <h3 className="font-bold text-lg mb-4">Register API endpoint</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Endpoint name (shown to buyers)</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="ai-summarize" className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none font-mono" />
        </div>
        <div>
          <label className="text-sm font-medium">Price per call (USDC)</label>
          <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none" />
        </div>
        {err && <div className="text-red-500 text-sm">{err}</div>}
        <div className="flex gap-2">
          <button onClick={submit} disabled={!name || busy}
            className="flex-1 py-3 rounded-xl bg-arc-gradient text-white font-bold disabled:opacity-50">
            {busy ? 'Registering...' : 'Register'}
          </button>
          <button onClick={onDone} className="px-4 py-3 rounded-xl border border-border">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EndpointIdBox({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="mt-3 p-3 bg-bg rounded-xl text-xs font-mono flex items-start gap-2">
      <div className="flex-1 break-all">
        <span className="text-muted">endpointId:</span> {id}
      </div>
      <button onClick={copy}
        className="shrink-0 px-2 py-1 rounded-md border border-border text-xs hover:bg-panel transition whitespace-nowrap"
        title="Copy endpointId">
        {copied ? '✓ Copied' : '📋 Copy'}
      </button>
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
