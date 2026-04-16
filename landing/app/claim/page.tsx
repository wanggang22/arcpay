'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useWalletClient,
} from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits } from 'viem';
import { ADDRESSES, tipJarByHandleAbi } from '@/lib/config';
import { TxLink, AddressLink } from '@/components/TxLink';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const HAS_PRIVY = PRIVY_APP_ID.length >= 20 && !PRIVY_APP_ID.includes('demo') && !PRIVY_APP_ID.includes('replace');

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Loading…</div>}>
      <ClaimInner />
    </Suspense>
  );
}

function ClaimInner() {
  const sp = useSearchParams();
  const { address, isConnected } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();

  const error = sp.get('error');
  const errorDetail = sp.get('detail');
  const handle = (sp.get('handle') || '').toLowerCase();
  const recipient = (sp.get('recipient') || '').toLowerCase();
  const deadline = sp.get('deadline') ? parseInt(sp.get('deadline')!) : 0;
  const signature = sp.get('signature') || '';

  const hasAttestation = Boolean(handle && recipient && deadline && signature);

  const [available, setAvailable] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [txErr, setTxErr] = useState('');

  useEffect(() => {
    if (!pub || !handle) { setAvailable(null); return; }
    (async () => {
      try {
        const amt = await pub.readContract({
          address: ADDRESSES.tipJarByHandle, abi: tipJarByHandleAbi,
          functionName: 'availableToClaim', args: [handle],
        }) as bigint;
        setAvailable(amt);
      } catch { setAvailable(null); }
    })();
  }, [pub, handle, tx]);

  const deadlinePassed = deadline > 0 && Date.now() / 1000 > deadline;
  const recipientMismatch = hasAttestation && address && address.toLowerCase() !== recipient;

  const startTwitter = () => {
    if (!address) return;
    window.location.href = `/api/auth/twitter/start?recipient=${address.toLowerCase()}`;
  };

  const claim = async () => {
    if (!wallet || !pub || !hasAttestation) return;
    setBusy(true); setTxErr('');
    try {
      const hash = await wallet.writeContract({
        address: ADDRESSES.tipJarByHandle, abi: tipJarByHandleAbi,
        functionName: 'claimByHandle',
        args: [handle, recipient as `0x${string}`, BigInt(deadline), signature as `0x${string}`],
      });
      await pub.waitForTransactionReceipt({ hash });
      setTx(hash);
    } catch (e: any) {
      setTxErr(e.shortMessage || e.message || 'Claim failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      <header className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-arc-gradient" />
          <span className="font-bold">ArcPay</span>
        </Link>
        <AuthBar />
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">🎁 Claim tips</h1>
        <p className="text-gray-600 text-sm mb-6">
          Tips sent to your X handle on Twitter accumulate on-chain. Prove ownership via X OAuth, connect the wallet you want them sent to, and claim.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800">
            <div className="font-bold">Authentication error</div>
            <div className="mt-1">{humanizeError(error)}</div>
            {errorDetail && <div className="mt-1 opacity-70 text-xs break-all">{errorDetail}</div>}
          </div>
        )}

        {/* Step 1: Connect wallet */}
        <Step num="1" title="Connect wallet" done={isConnected}>
          {!isConnected ? (
            <p className="text-sm text-gray-600">Use email, Google, Twitter, Discord, Farcaster, or an external wallet.</p>
          ) : (
            <div className="text-sm text-gray-700">
              Connected: <AddressLink address={address!} />
            </div>
          )}
        </Step>

        {/* Step 2: Sign in with X */}
        <Step num="2" title="Sign in with X to prove handle ownership" done={hasAttestation && !deadlinePassed}>
          {!isConnected ? (
            <p className="text-sm text-gray-500">Connect a wallet first.</p>
          ) : !hasAttestation ? (
            <button onClick={startTwitter}
              className="w-full py-3 rounded-xl bg-black text-white font-bold hover:opacity-90 flex items-center justify-center gap-2">
              <span>𝕏</span> Sign in with X
            </button>
          ) : (
            <div className="text-sm">
              <div>✓ Verified handle: <strong>@{handle}</strong></div>
              <div className="text-xs text-gray-500 mt-1">
                Attestation valid until {new Date(deadline * 1000).toLocaleTimeString()}
                {deadlinePassed && <span className="text-red-600 font-bold"> · expired, sign in again</span>}
              </div>
            </div>
          )}
        </Step>

        {/* Step 3: Claim */}
        <Step num="3" title="Claim pending tips" done={!!tx}>
          {!hasAttestation ? (
            <p className="text-sm text-gray-500">Complete step 2 first.</p>
          ) : recipientMismatch ? (
            <p className="text-sm text-red-600">
              Attestation was issued for <code className="font-mono bg-red-50 px-1 rounded">{recipient.slice(0, 10)}…{recipient.slice(-6)}</code> but connected wallet is different. Switch wallets or re-sign in with X.
            </p>
          ) : deadlinePassed ? (
            <button onClick={startTwitter}
              className="w-full py-3 rounded-xl bg-black text-white font-bold flex items-center justify-center gap-2">
              Attestation expired — Re-sign in with X
            </button>
          ) : (
            <>
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="text-xs text-green-700">Available to claim for @{handle}</div>
                <div className="text-2xl font-bold text-green-700 mt-1">
                  {available === null ? '…' : `${Number(formatUnits(available, 18)).toFixed(4)} USDC`}
                </div>
              </div>
              {available !== null && available > 0n ? (
                <button onClick={claim} disabled={busy}
                  className="w-full py-3 rounded-xl bg-arc-gradient text-white font-bold disabled:opacity-60">
                  {busy ? 'Claiming…' : `Claim ${Number(formatUnits(available, 18)).toFixed(4)} USDC`}
                </button>
              ) : (
                <div className="text-sm text-gray-600 italic">No pending tips for @{handle} yet. Share your X profile + ArcPay extension so fans can tip you!</div>
              )}
              {tx && (
                <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
                  ✓ Claimed! <TxLink tx={tx} />
                </div>
              )}
              {txErr && (
                <div className="mt-3 text-sm bg-red-50 border border-red-200 rounded-xl p-3 text-red-700">
                  {txErr}
                </div>
              )}
            </>
          )}
        </Step>

        <div className="mt-10 text-xs text-gray-500 text-center">
          <p>💡 Tips are held in <code className="bg-gray-100 px-1 rounded">TipJarByHandle</code> on Arc testnet.</p>
          <p className="mt-1">ArcPay never holds your funds — only your X handle → wallet binding is verified off-chain; payout is trustless on-chain.</p>
        </div>
      </main>
    </div>
  );
}

function Step({ num, title, done, children }: { num: string; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className={`mb-4 p-5 rounded-2xl border ${done ? 'border-green-300 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
          ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {done ? '✓' : num}
        </div>
        <div className="font-bold">{title}</div>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  );
}

function humanizeError(code: string): string {
  switch (code) {
    case 'missing_recipient': return 'Wallet address missing. Connect a wallet first, then sign in with X.';
    case 'state_mismatch': return 'OAuth state mismatch (possible replay/CSRF). Try again.';
    case 'token_exchange_failed': return 'Twitter rejected the authorization code. Retry.';
    case 'invalid_handle': return 'Could not verify your X handle.';
    case 'sign_exception': return 'Backend signing failed. Please retry.';
    case 'server_not_configured': return 'OAuth is not configured on this deployment. Admin: set TWITTER_CLIENT_ID/SECRET + ATTESTATION_SIGNER_PK.';
    default: return code.replace(/_/g, ' ');
  }
}

function AuthBar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const privy = HAS_PRIVY ? usePrivy() : null;
  const wallets = HAS_PRIVY ? useWallets().wallets : [];

  if (HAS_PRIVY && privy) {
    if (!privy.ready) return <span className="text-xs text-gray-500">Loading…</span>;
    if (!privy.authenticated) {
      return (
        <button onClick={() => privy.login()}
          className="px-4 py-2 rounded-xl bg-arc-gradient text-white text-sm font-semibold">
          Sign in
        </button>
      );
    }
    const w = wallets[0];
    return (
      <div className="flex items-center gap-2">
        {w && <span className="text-xs font-mono text-gray-600">{w.address.slice(0, 6)}…{w.address.slice(-4)}</span>}
        <button onClick={() => privy.logout()} className="px-2 py-1 rounded-md border border-gray-200 text-xs">Sign out</button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button onClick={() => connectors[0] && connect({ connector: connectors[0] })}
        className="px-4 py-2 rounded-xl bg-arc-gradient text-white text-sm font-semibold">
        Connect wallet
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {address && <span className="text-xs font-mono text-gray-600">{address.slice(0, 6)}…{address.slice(-4)}</span>}
      <button onClick={() => disconnect()} className="px-2 py-1 rounded-md border border-gray-200 text-xs">Disconnect</button>
    </div>
  );
}
