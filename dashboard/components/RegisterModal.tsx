'use client';
import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, registryAbi } from '@/lib/config';

export function RegisterModal({ onRegistered }: { onRegistered: (u: string) => void }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const { data: bal } = useBalance({ address: address as `0x${string}` | undefined });

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = /^[a-z0-9_-]{3,32}$/.test(username);
  const hasBalance = bal && bal.value > 0n;

  const submit = async () => {
    if (!wallet || !address || !pub || !valid) return;
    setBusy(true); setError('');
    try {
      const metadataURI = bio ? `data:application/json,${encodeURIComponent(JSON.stringify({ bio }))}` : '';
      const tx = await wallet.writeContract({
        address: ADDRESSES.registry, abi: registryAbi, functionName: 'register',
        args: [username, displayName, metadataURI],
      });
      await pub.waitForTransactionReceipt({ hash: tx });
      onRegistered(username);
    } catch (e: any) {
      setError(e.shortMessage || e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-arc-gradient text-white text-3xl mb-4">
          🚀
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Claim your ArcPay handle</h2>
        <p className="text-muted text-sm mt-2 max-w-md mx-auto leading-relaxed">
          One URL for everything — tips, subscriptions, paywalled content, paid API endpoints. Paid in USDC, settled on Arc in seconds.
        </p>
      </div>

      <div className="bg-panel border border-border rounded-3xl p-7">
        <div className="space-y-5">
          {/* Username with inline domain prefix */}
          <div>
            <label className="text-sm font-bold">Pick your username</label>
            <div className={`mt-2 flex items-stretch rounded-xl border-2 overflow-hidden transition
              ${valid ? 'border-green-400' : username ? 'border-amber-400' : 'border-border focus-within:border-accent'}`}>
              <span className="px-3 py-3 bg-bg text-muted text-sm font-mono flex items-center select-none">
                arcpay.finance/
              </span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="yourname"
                className="flex-1 px-3 py-3 focus:outline-none font-mono bg-transparent min-w-0"
                maxLength={32}
                autoFocus
              />
            </div>
            <div className="mt-1.5 text-xs text-muted">3–32 chars. a–z, 0–9, underscore, dash.</div>
          </div>

          {/* Live preview card */}
          {username && (
            <div className={`p-3.5 rounded-xl border ${valid ? 'bg-green-500/5 border-green-400/40' : 'bg-amber-500/5 border-amber-400/40'}`}>
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted">
                Preview · your public payment link
              </div>
              <div className="mt-1 font-mono text-sm font-bold break-all">
                https://arcpay.finance/<span className={valid ? 'text-accent' : 'text-amber-600'}>{username}</span>
              </div>
              {valid && (
                <div className="text-xs text-muted mt-2 leading-relaxed">
                  Share this link. Fans sign in with email/wallet → tip, subscribe, unlock content — all in one place.
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-bold">Display name <span className="text-muted font-normal">(optional)</span></label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Alice Chen"
              className="mt-2 w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold">Bio <span className="text-muted font-normal">(optional)</span></label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 280))}
              placeholder="Writer, builder, coffee enthusiast"
              className="mt-2 w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-accent focus:outline-none resize-none h-20"
            />
            <div className="mt-1 text-[11px] text-muted text-right">{bio.length}/280</div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</div>
          )}

          {/* Gas hint */}
          {address && !hasBalance && (
            <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-700 rounded-xl p-3">
              ⚠️ Your wallet has 0 USDC. Registration needs a small amount for gas.{' '}
              <a href="https://arcpay.finance/faucet" target="_blank" rel="noopener noreferrer"
                className="font-bold underline">💧 Get free faucet USDC →</a>
            </div>
          )}

          <button
            onClick={submit}
            disabled={!valid || busy}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-arc-gradient disabled:opacity-40 hover:opacity-90 transition text-base">
            {busy
              ? 'Claiming on-chain…'
              : valid
                ? `Claim arcpay.finance/${username} →`
                : 'Type a username to continue'}
          </button>

          <div className="text-[11px] text-muted text-center pt-1 leading-relaxed">
            One-time transaction · registered on{' '}
            <a href="https://testnet.arcscan.app/address/0xBF6c8b430BE134C40fEF316601ef002a4F8e2dBb"
              target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
              UsernameRegistry
            </a>{' '}
            · you own the handle, not us
          </div>
        </div>
      </div>

      {/* What you unlock */}
      <div className="mt-7">
        <div className="text-[11px] uppercase tracking-wider font-bold text-muted text-center mb-3">
          What your handle unlocks
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { icon: '💸', label: 'Tips', desc: 'One-time USDC' },
            { icon: '📅', label: 'Subscriptions', desc: 'Monthly plans' },
            { icon: '🔒', label: 'Content', desc: 'One-off unlocks' },
            { icon: '⚡', label: 'Paid API', desc: 'AI agent billing' },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-xl bg-panel border border-border text-center">
              <div className="text-xl">{m.icon}</div>
              <div className="text-xs font-bold mt-1">{m.label}</div>
              <div className="text-[10px] text-muted mt-0.5">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
