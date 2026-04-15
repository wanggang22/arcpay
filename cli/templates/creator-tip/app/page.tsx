'use client';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { NETWORKS, tipJarAbi } from '@arcpay/sdk';

const username = process.env.NEXT_PUBLIC_CREATOR_USERNAME || 'alice';
const displayName = process.env.NEXT_PUBLIC_CREATOR_DISPLAY_NAME || username;
const bio = process.env.NEXT_PUBLIC_CREATOR_BIO || '';
const network = (process.env.NEXT_PUBLIC_NETWORK || 'local') as 'local' | 'testnet';
const addresses = NETWORKS[network].addresses;

const PRESETS = ['0.001', '0.005', '0.01', '0.05'];

export default function Page() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [amount, setAmount] = useState('0.005');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tx: string } | null>(null);
  const [error, setError] = useState('');

  const onTip = async () => {
    if (!walletClient || !address || !publicClient) return;
    setSending(true); setError(''); setResult(null);
    try {
      const tx = await walletClient.writeContract({
        address: addresses.tipJar,
        abi: tipJarAbi,
        functionName: 'tip',
        args: [username, message],
        value: parseUnits(amount, 18),
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setResult({ tx });
      setMessage('');
    } catch (e: any) {
      setError(e.shortMessage || e.message);
    } finally { setSending(false); }
  };

  return (
    <main className="max-w-lg mx-auto p-6 pt-10">
      <header className="flex justify-between items-center mb-8">
        <div className="text-sm text-gray-500">Powered by ArcPay</div>
        <ConnectButton />
      </header>

      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold mt-4">{displayName}</h1>
          <div className="text-gray-500 text-sm">@{username}</div>
          {bio && <p className="mt-2 text-gray-600">{bio}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">Amount (USDC)</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESETS.map(p => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition
                    ${amount === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  ${p}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:outline-none"
                placeholder="0.005"
                inputMode="decimal"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 280))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:outline-none resize-none h-20"
              placeholder="Say something nice..."
            />
            <div className="text-xs text-gray-400 text-right">{message.length}/280</div>
          </div>

          {!address ? (
            <div className="text-center py-4 text-gray-500 text-sm">Connect your wallet to tip</div>
          ) : (
            <button
              onClick={onTip}
              disabled={sending || !amount || parseFloat(amount) <= 0}
              className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-500 to-pink-500 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-95 transition">
              {sending ? 'Sending...' : `Tip $${amount}`}
            </button>
          )}

          {result && (
            <div className="text-center text-green-600 text-sm bg-green-50 py-3 rounded-xl">
              ✓ Thanks for your tip!<br/>
              <span className="text-xs text-gray-500 font-mono">{result.tx.slice(0, 10)}...{result.tx.slice(-8)}</span>
            </div>
          )}
          {error && <div className="text-red-500 text-sm bg-red-50 py-2 px-3 rounded-xl">{error}</div>}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center">
          USDC on Arc Network · 98% goes to creator · 2% protocol fee
        </div>
      </div>
    </main>
  );
}
