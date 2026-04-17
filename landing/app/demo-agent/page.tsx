'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useWalletClient, useBalance } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits, keccak256, stringToBytes } from 'viem';
import { ADDRESSES, payPerCallAbi } from '@/lib/config';

const AUTHOR = 'gavin';
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const HAS_PRIVY = PRIVY_APP_ID.length >= 20 && !PRIVY_APP_ID.includes('demo') && !PRIVY_APP_ID.includes('replace');

type Endpoint = {
  id: `0x${string}`;
  name: string;
  pricePerCall: bigint;
  active: boolean;
  totalCalls: bigint;
  totalRevenue: bigint;
};

type Credit = {
  callId: string;
  txHash: string;
};

type LogEntry = {
  callId: string;
  input: string;
  output: string;
  ts: number;
  status: 'success' | 'error';
  error?: string;
};

export default function DemoAgent() {
  const { address, isConnected } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const { data: bal } = useBalance({ address: address as `0x${string}` | undefined });

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('Hello, how are you?');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [buying, setBuying] = useState(false);
  const [calling, setCalling] = useState(false);
  const [err, setErr] = useState('');
  const [qty, setQty] = useState(10);

  const storageKey = useMemo(() => {
    if (!address || !endpoint) return null;
    return `arcpay-demo-credits-${address.toLowerCase()}-${endpoint.id}`;
  }, [address, endpoint]);

  const logKey = useMemo(() => {
    if (!address) return null;
    return `arcpay-demo-log-${address.toLowerCase()}`;
  }, [address]);

  // Load endpoint
  useEffect(() => {
    if (!pub) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ids: any = await pub.readContract({
          address: ADDRESSES.payPerCall, abi: payPerCallAbi,
          functionName: 'getCreatorEndpoints', args: [AUTHOR],
        });
        for (const id of (ids as `0x${string}`[])) {
          const e: any = await pub.readContract({
            address: ADDRESSES.payPerCall, abi: payPerCallAbi,
            functionName: 'getEndpoint', args: [id],
          });
          if (e.active) {
            if (cancelled) return;
            setEndpoint({
              id,
              name: e.name,
              pricePerCall: e.pricePerCall,
              active: e.active,
              totalCalls: e.totalCalls,
              totalRevenue: e.totalRevenue,
            });
            return;
          }
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pub]);

  // Load credits + log from localStorage
  useEffect(() => {
    if (!storageKey) return;
    try { setCredits(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!logKey) return;
    try { setLog(JSON.parse(localStorage.getItem(logKey) || '[]')); } catch {}
  }, [logKey]);

  const saveCredits = (next: Credit[]) => {
    setCredits(next);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const saveLog = (next: LogEntry[]) => {
    setLog(next);
    if (logKey) localStorage.setItem(logKey, JSON.stringify(next.slice(0, 20)));
  };

  const buy = async () => {
    if (!wallet || !pub || !endpoint) return;
    setBuying(true); setErr('');
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.payPerCall, abi: payPerCallAbi,
        functionName: 'batchPay', args: [endpoint.id, BigInt(qty)],
        value: endpoint.pricePerCall * BigInt(qty),
      });
      const receipt = await pub.waitForTransactionReceipt({ hash });
      const paidLogs = receipt.logs.filter(
        (l) => l.address.toLowerCase() === ADDRESSES.payPerCall.toLowerCase()
      );
      const newCredits: Credit[] = [];
      for (const l of paidLogs) {
        if (l.topics[1]) {
          newCredits.push({ callId: BigInt(l.topics[1]).toString(), txHash: hash });
        }
      }
      saveCredits([...credits, ...newCredits]);
    } catch (e: any) {
      setErr(e.shortMessage || e.message || 'Buy failed');
    } finally {
      setBuying(false);
    }
  };

  const call = async () => {
    if (!wallet || !endpoint) return;
    if (credits.length === 0) {
      setErr('You have 0 credits. Buy some first.');
      return;
    }
    if (!text.trim()) {
      setErr('Enter text to translate');
      return;
    }
    setCalling(true); setErr('');
    const credit = credits[0];
    try {
      const message = `arcpay-call:${credit.callId}`;
      const signature = await wallet.signMessage({ message });

      const res = await fetch('/api/demo-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: credit.callId,
          signature,
          text,
          endpointId: endpoint.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(`${res.status} ${data.error || 'Call failed'}`);
        saveLog([
          { callId: credit.callId, input: text, output: '', ts: Date.now(), status: 'error', error: data.error },
          ...log,
        ]);
        // On 402, consume the credit locally too (to avoid retry loop)
        if (res.status === 402) saveCredits(credits.slice(1));
        return;
      }
      // success
      saveCredits(credits.slice(1));
      saveLog([
        { callId: credit.callId, input: text, output: data.translated, ts: Date.now(), status: 'success' },
        ...log,
      ]);
      setText('');
    } catch (e: any) {
      setErr(e.shortMessage || e.message || 'Call failed');
    } finally {
      setCalling(false);
    }
  };

  const creditsRemaining = credits.length;
  const costPer = endpoint ? endpoint.pricePerCall : 0n;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-indigo-500/40">
      <AgentHeader />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading endpoint…</div>
        ) : !endpoint ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left: agent UI */}
            <div className="md:col-span-3 space-y-5">
              {/* Title */}
              <div>
                <div className="text-xs uppercase tracking-wider text-indigo-400 font-bold">
                  Mock AI Agent · Translation service
                </div>
                <h1 className="text-3xl font-bold mt-1">🤖 Translate EN → ZH</h1>
                <div className="mt-1 text-sm text-gray-400">
                  Every call is paid on-chain per <code className="text-indigo-300">x402</code> / ERC-8183.
                </div>
              </div>

              {/* Input */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Input (English)</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 500))}
                  placeholder="Hello, how are you?"
                  className="mt-2 w-full px-3 py-2.5 rounded-lg bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:outline-none text-sm resize-none h-24 text-gray-100"
                />
                <div className="mt-1 text-[10px] text-gray-500 text-right">{text.length}/500</div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    Each call = <span className="font-bold text-indigo-300">{formatUnits(costPer, 18)} USDC</span>
                  </div>
                  {address ? (
                    <button onClick={call} disabled={calling || creditsRemaining === 0 || !text.trim()}
                      className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-bold transition">
                      {calling ? 'Signing & calling…' : creditsRemaining === 0 ? 'Buy credits first' : `Call (1 credit)`}
                    </button>
                  ) : (
                    <div className="text-xs text-gray-500">Sign in to use</div>
                  )}
                </div>
              </div>

              {/* Latest result */}
              {log[0] && (
                <div className={`border rounded-2xl p-5 ${log[0].status === 'success' ? 'bg-emerald-500/5 border-emerald-800' : 'bg-red-500/5 border-red-800'}`}>
                  <div className="text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                    {log[0].status === 'success' ? (
                      <span className="text-emerald-400">✓ Verified · callId #{log[0].callId}</span>
                    ) : (
                      <span className="text-red-400">✗ Call failed · callId #{log[0].callId}</span>
                    )}
                  </div>
                  {log[0].status === 'success' ? (
                    <>
                      <div className="text-lg font-bold text-gray-100">{log[0].output}</div>
                      <div className="text-xs text-gray-500 mt-2 font-mono">
                        Server verified: signature matches on-chain payer → credit consumed → translation returned
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-red-200">{log[0].error}</div>
                  )}
                </div>
              )}

              {err && !calling && (
                <div className="text-sm bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-3">{err}</div>
              )}

              {/* Usage log */}
              {log.length > 1 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">
                    Recent calls (local history)
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    {log.slice(1, 6).map((l) => (
                      <div key={l.callId + l.ts} className="flex items-start gap-3 py-1 border-t border-gray-800 pt-2">
                        <span className="text-gray-600">#{l.callId}</span>
                        <span className={l.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                          {l.status === 'success' ? '✓' : '✗'}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-gray-300">
                          {l.input} {l.status === 'success' && <span className="text-gray-500">→ {l.output}</span>}
                        </span>
                        <span className="text-gray-600 shrink-0">{relTime(l.ts)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: endpoint + credits */}
            <div className="md:col-span-2 space-y-4">
              <EndpointCard endpoint={endpoint} />

              <div className="md:sticky md:top-20 space-y-4">
                <CreditsCard
                  credits={creditsRemaining}
                  balance={bal?.value ?? 0n}
                  costPer={costPer}
                  qty={qty}
                  setQty={setQty}
                  onBuy={buy}
                  busy={buying}
                  address={address}
                />
              </div>
            </div>
          </div>
        )}

        {/* Developer explainer */}
        <DevBlock />
      </main>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Endpoint</div>
      <div className="mt-1 font-mono font-bold text-indigo-300">{endpoint.name}</div>
      <div className="text-[10px] font-mono text-gray-500 truncate mt-1" title={endpoint.id}>
        {endpoint.id.slice(0, 14)}…{endpoint.id.slice(-6)}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 space-y-1 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Creator</span>
          <Link href={`/${AUTHOR}`} className="font-bold text-indigo-300 hover:text-indigo-200">@{AUTHOR}</Link>
        </div>
        <div className="flex justify-between">
          <span>Price per call</span>
          <span className="font-bold text-gray-100">{formatUnits(endpoint.pricePerCall, 18)} USDC</span>
        </div>
        <div className="flex justify-between">
          <span>Total calls served</span>
          <span className="font-bold text-gray-100">{Number(endpoint.totalCalls)}</span>
        </div>
        <div className="flex justify-between">
          <span>Lifetime revenue</span>
          <span className="font-bold text-gray-100">{Number(formatUnits(endpoint.totalRevenue, 18)).toFixed(4)} USDC</span>
        </div>
      </div>
    </div>
  );
}

function CreditsCard({
  credits, balance, costPer, qty, setQty, onBuy, busy, address,
}: {
  credits: number;
  balance: bigint;
  costPer: bigint;
  qty: number;
  setQty: (n: number) => void;
  onBuy: () => void;
  busy: boolean;
  address: string | undefined;
}) {
  const total = costPer * BigInt(qty);
  const totalNum = Number(formatUnits(total, 18));
  const balanceNum = Number(formatUnits(balance, 18));
  const canAfford = balance >= total;
  return (
    <div className="bg-gradient-to-br from-indigo-500/10 to-pink-500/10 border border-indigo-500/30 rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-gray-400 font-bold">Your credits</div>
      <div className="mt-1 text-4xl font-bold text-indigo-300">{credits}</div>
      <div className="text-xs text-gray-500">unused callIds on-chain</div>

      <div className="mt-5 pt-4 border-t border-gray-800">
        <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Buy more</div>
        <div className="flex gap-1.5">
          {[1, 10, 50, 100].map((n) => (
            <button key={n} onClick={() => setQty(n)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition
                ${qty === n ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Total: <span className="font-bold text-gray-100">{totalNum.toFixed(6)} USDC</span>
          <span className="text-gray-600 ml-2">(1 tx, {qty} callIds)</span>
        </div>
        {address ? (
          <button onClick={onBuy} disabled={busy || !canAfford}
            className="mt-3 w-full py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-pink-500 disabled:opacity-50 hover:opacity-90 transition text-sm">
            {busy ? 'Paying…' : canAfford ? `batchPay(${qty}) — ${totalNum.toFixed(6)} USDC` : 'Not enough USDC'}
          </button>
        ) : (
          <div className="mt-3 text-center text-xs text-gray-500">Sign in to buy</div>
        )}
        <div className="mt-2 text-[10px] text-gray-500">
          Balance: {balanceNum.toFixed(4)} USDC ·{' '}
          <a href="/faucet" target="_blank" rel="noopener noreferrer" className="underline text-indigo-300 hover:text-indigo-200">get faucet USDC</a>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🤖</div>
      <h2 className="text-2xl font-bold">@{AUTHOR} hasn&apos;t registered an API endpoint yet</h2>
      <p className="mt-3 text-gray-400 text-sm">
        Creator needs to add one at{' '}
        <a href="https://app.arcpay.finance/api" className="underline text-indigo-400" target="_blank" rel="noopener noreferrer">
          app.arcpay.finance/api
        </a>
      </p>
    </div>
  );
}

function DevBlock() {
  return (
    <aside className="mt-16 p-6 rounded-2xl bg-gray-900 border border-gray-800">
      <div className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-2">For developers · x402 flow</div>
      <div className="text-sm text-gray-300 leading-relaxed">
        Every call is a <strong>real HTTP 402 payment flow</strong>. No API key, no OAuth — wallet signature IS the credential:
      </div>
      <pre className="mt-3 text-xs bg-black border border-gray-800 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed text-gray-200">
{`// CLIENT — sign a message naming the credit to spend
const signature = await wallet.signMessage({
  message: \`arcpay-call:\${callId}\`,
});
fetch('/api/demo-translate', {
  method: 'POST',
  body: JSON.stringify({ callId, signature, text, endpointId }),
});

// SERVER — 4-step gate
const receipt = await readContract({ functionName: 'getReceipt', args: [callId] });
if (consumed.has(callId))          return res.status(402);
if (receipt.payer === zero)        return res.status(402);   // no such credit
if (receipt.endpointId !== target) return res.status(402);   // wrong endpoint
if (!verifyMessage({ address: receipt.payer, message, signature }))
  return res.status(402);          // signature mismatch
consumed.add(callId);
return runTheWork(input);`}
      </pre>
      <div className="mt-3 text-sm text-gray-300">
        Two AI agents can transact without a Stripe account, without an API key exchange, without OAuth.
        The chain is the audit log. The signature is the auth.
      </div>
      <Link href="/build#api" className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-gray-200">
        See full developer guide →
      </Link>
    </aside>
  );
}

function AgentHeader() {
  return (
    <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
            🤖
          </div>
          <div className="min-w-0 leading-tight">
            <div className="font-bold text-base truncate text-gray-100">Translate Agent</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 hidden sm:block">
              pay-per-call demo · x402
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/faucet"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-900 transition"
            title="Get USDC">
            <span>💧</span><span className="hidden sm:inline">Faucet</span>
          </Link>
          <Link href={`/${AUTHOR}`}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-900 transition">
            <span>↗</span><span className="hidden sm:inline">Creator</span>
          </Link>
          <div className="hidden sm:block w-px h-6 bg-gray-800 mx-1" />
          <AuthBar />
        </div>
      </div>
    </header>
  );
}

function AuthBar() {
  if (!HAS_PRIVY) return null;
  return <PrivyAuthBar />;
}

function PrivyAuthBar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);

  if (!ready) return <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />;
  if (!authenticated) {
    return (
      <button onClick={() => login()}
        className="text-xs px-3.5 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-gray-200 transition">
        Sign in
      </button>
    );
  }
  const u: any = user;
  const ident = (() => {
    if (u?.twitter?.username) return { label: `@${u.twitter.username}`, avatar: u.twitter.profilePictureUrl, emoji: '𝕏' };
    if (u?.google?.email) return { label: u.google.name || u.google.email, emoji: 'G' };
    if (u?.discord?.username) return { label: u.discord.username, emoji: '💬' };
    if (u?.farcaster?.username) return { label: `@${u.farcaster.username}`, avatar: u.farcaster.pfp, emoji: 'ᶠ' };
    if (u?.github?.username) return { label: u.github.username, emoji: '⌨' };
    if (u?.email?.address) return { label: u.email.address, emoji: '✉' };
    return { label: 'Signed in', emoji: '✓' };
  })();
  const w = wallets[0];
  const short = w ? `${w.address.slice(0, 6)}…${w.address.slice(-4)}` : '';
  const full = w?.address || '';
  const copy = async () => { try { await navigator.clipboard.writeText(full); } catch {} };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 hover:border-gray-600 transition">
        {ident.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ident.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold">
            {ident.emoji}
          </div>
        )}
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-xs font-bold truncate max-w-[120px] text-gray-100">{ident.label}</span>
          {short && <span className="text-[10px] font-mono text-gray-500">{short}</span>}
        </div>
        <svg viewBox="0 0 20 20" className="w-3 h-3 text-gray-500 hidden md:block" fill="currentColor">
          <path d="M5 8l5 5 5-5H5z" />
        </svg>
      </button>
      {open && (
        <>
          <button onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" />
          <div className="absolute right-0 top-full mt-1 w-60 rounded-xl bg-gray-900 border border-gray-800 shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Signed in as</div>
              <div className="mt-1 font-bold text-sm truncate text-gray-100">{ident.label}</div>
            </div>
            {w && (
              <button onClick={copy} className="w-full p-3 text-left hover:bg-gray-800 border-b border-gray-800">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Wallet</div>
                <div className="mt-1 font-mono text-xs truncate text-gray-100" title={full}>{short}</div>
                <div className="text-[10px] text-indigo-400 mt-0.5">Click to copy full address</div>
              </button>
            )}
            <button onClick={() => { setOpen(false); logout(); }}
              className="w-full p-3 text-left hover:bg-red-500/10 text-xs text-red-400 font-bold">
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function relTime(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
