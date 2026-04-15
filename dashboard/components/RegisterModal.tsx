'use client';
import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ADDRESSES, registryAbi } from '@/lib/config';

export function RegisterModal({ onRegistered }: { onRegistered: (u: string) => void }) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = /^[a-z0-9_-]{3,32}$/.test(username);

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
    <div className="bg-panel border border-border rounded-3xl p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold">Claim your username</h2>
      <p className="text-muted text-sm mt-2">This is your public ArcPay handle, e.g., <span className="font-mono">arcpay.io/alice</span></p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Username</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="alice"
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none font-mono"
            maxLength={32}
          />
          <div className="text-xs text-muted mt-1">3-32 chars. a-z, 0-9, underscore, dash only.</div>
        </div>
        <div>
          <label className="text-sm font-medium">Display name (optional)</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Alice Chen"
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Bio (optional)</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 280))}
            placeholder="Writer, builder, coffee enthusiast"
            className="mt-1 w-full px-4 py-2 rounded-xl border border-border focus:border-accent focus:outline-none resize-none h-20"
          />
        </div>

        {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

        <button
          onClick={submit}
          disabled={!valid || busy}
          className="w-full py-3 rounded-xl font-bold text-white bg-arc-gradient disabled:opacity-50">
          {busy ? 'Registering...' : 'Register'}
        </button>
      </div>
    </div>
  );
}
