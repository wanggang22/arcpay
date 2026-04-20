'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useReadContract,
  useBalance,
} from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits, parseUnits } from 'viem';
import Link from 'next/link';
import { ADDRESSES, registryAbi, tipJarAbi, tipJarByHandleAbi } from '@/lib/config';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const HAS_PRIVY = PRIVY_APP_ID.length >= 20 && !PRIVY_APP_ID.includes('demo') && !PRIVY_APP_ID.includes('replace');

export default function QuickTipPage() {
  const params = useParams();
  const sp = useSearchParams();
  const handle = ((params.handle as string) || '').toLowerCase();
  const tweetRef = sp.get('ref') || '';
  const preset = sp.get('amount') || '0.005';

  const { address, isConnected } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();

  const { data: exists } = useReadContract({
    address: ADDRESSES.registry,
    abi: registryAbi,
    functionName: 'exists',
    args: [handle],
    query: { enabled: Boolean(handle) },
  });

  const { data: bal } = useBalance({ address: address as `0x${string}` | undefined });

  const [xProfile, setXProfile] = useState<{ name?: string; avatar?: string } | null>(null);
  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    fetch(`/api/x-profile?handle=${encodeURIComponent(handle)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && !d.error) setXProfile(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [handle]);

  const [amount, setAmount] = useState(preset);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const send = async () => {
    if (!wallet || !address || !pub) return;
    setBusy(true); setErr(''); setTx(null);
    try {
      const value = parseUnits(amount, 18);
      let hash: `0x${string}`;
      if (exists) {
        hash = await wallet.writeContract({
          address: ADDRESSES.tipJar, abi: tipJarAbi, functionName: 'tip',
          args: [handle, message], value,
        });
      } else {
        hash = await wallet.writeContract({
          address: ADDRESSES.tipJarByHandle, abi: tipJarByHandleAbi, functionName: 'tipByHandle',
          args: [handle, message], value,
        });
      }
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash);

      try {
        if (window.opener) {
          window.opener.postMessage({
            type: 'arcpay:tipped',
            handle,
            amount,
            txHash: hash,
            tweetRef,
          }, '*');
        }
      } catch {}

      // Close popup after a brief success animation
      setTimeout(() => {
        try { window.close(); } catch {}
      }, 1200);
    } catch (e: any) {
      setErr(e.shortMessage || e.message || 'Tip failed');
    } finally {
      setBusy(false);
    }
  };

  const displayName = xProfile?.name || handle;

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="h-12 bg-accent" />

          <div className="p-5 -mt-6">
            <div className="flex items-center gap-3">
              {xProfile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={xProfile.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow" alt={displayName} />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-white shadow bg-accent text-white flex items-center justify-center font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{displayName}</div>
                <a href={`https://x.com/${handle}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-500 font-mono hover:text-accent">@{handle} ↗</a>
              </div>
            </div>

            {exists === false && (
              <div className="mt-3 text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 leading-snug">
                @{handle} hasn&apos;t joined ArcPay yet — tips held on-chain, they claim at <strong>arcpay.finance/claim</strong>.
              </div>
            )}

            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {['0.001', '0.005', '0.01', '0.05'].map((p) => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`py-1.5 rounded-lg text-xs font-bold border-2 transition
                    ${amount === p ? 'border-accent bg-accent/10 text-accent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  ${p}
                </button>
              ))}
            </div>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-accent focus:outline-none"
              placeholder="Custom amount (USDC)"
              inputMode="decimal"
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none h-14 focus:border-accent focus:outline-none"
              placeholder="Message (optional)"
            />

            <div className="mt-3">
              <AuthSlot />
            </div>

            {isConnected && (
              <button
                onClick={send}
                disabled={busy || !amount || tx !== null}
                className="mt-2 w-full py-2.5 rounded-xl text-white text-sm font-bold bg-accent disabled:opacity-60 transition"
              >
                {tx ? '✓ Sent — closing…' : busy ? 'Sending…' : `Send $${amount}`}
              </button>
            )}

            {isConnected && bal && (
              <div className="mt-2 text-[10px] text-right text-gray-400">
                Balance: {Number(formatUnits(bal.value, 18)).toFixed(4)} USDC
              </div>
            )}

            {err && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2 leading-snug">{err}</div>
            )}

            <div className="mt-3 text-[10px] text-center text-gray-400">
              Powered by{' '}
              <Link href="/" target="_blank" className="underline hover:text-gray-600">ArcPay</Link>
              {' '}· Arc Network · instant, 2% fee
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AuthSlot() {
  if (HAS_PRIVY) return <PrivySlot />;
  return <div className="text-xs text-gray-500 text-center py-2">Connect a wallet in your browser.</div>;
}

function identOf(user: any): { label: string; avatar?: string; emoji: string } | null {
  if (!user) return null;
  if (user.twitter?.username) return { label: `@${user.twitter.username}`, avatar: user.twitter.profilePictureUrl, emoji: '𝕏' };
  if (user.google?.email) return { label: user.google.name || user.google.email, emoji: 'G' };
  if (user.discord?.username) return { label: user.discord.username, emoji: '💬' };
  if (user.farcaster?.username) return { label: `@${user.farcaster.username}`, avatar: user.farcaster.pfp, emoji: 'ᶠ' };
  if (user.github?.username) return { label: user.github.username, emoji: '⌨' };
  if (user.email?.address) return { label: user.email.address, emoji: '✉' };
  return null;
}

function PrivySlot() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { address } = useAccount();

  if (!ready) {
    return <div className="w-full py-2 text-xs text-center text-gray-500">Loading wallet…</div>;
  }

  if (!authenticated) {
    return (
      <button onClick={() => login()}
        className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-bold">
        Sign in to tip (email / X / Google / wallet)
      </button>
    );
  }

  const wallet = wallets[0];
  const shown = wallet?.address || address;
  const short = shown ? `${shown.slice(0, 6)}…${shown.slice(-4)}` : '';
  const ident = identOf(user);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {ident?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ident.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold shrink-0">
            {ident?.emoji || '✓'}
          </div>
        )}
        <div className="min-w-0">
          {ident && <div className="text-[11px] font-medium truncate">{ident.label}</div>}
          <div className="text-[10px] font-mono text-gray-500 truncate">{short}</div>
        </div>
      </div>
      <button onClick={() => logout()} className="text-[10px] text-gray-500 hover:text-gray-800 shrink-0">sign out</button>
    </div>
  );
}
