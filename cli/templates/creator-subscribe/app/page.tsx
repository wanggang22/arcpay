'use client';
import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { NETWORKS, subscriptionsAbi } from '@wanggang22/arcpay-sdk';

const creator = process.env.NEXT_PUBLIC_CREATOR_USERNAME || 'alice';
const displayName = process.env.NEXT_PUBLIC_CREATOR_DISPLAY_NAME || creator;
const bio = process.env.NEXT_PUBLIC_CREATOR_BIO || 'Posts you will not find anywhere else.';
const planId = BigInt(process.env.NEXT_PUBLIC_PLAN_ID || '1');
const pricePerMonth = process.env.NEXT_PUBLIC_PRICE_PER_MONTH || '0.01';
const network = (process.env.NEXT_PUBLIC_NETWORK || 'local') as 'local' | 'testnet';
const addresses = NETWORKS[network].addresses;

const DURATIONS = [1, 3, 6, 12];

export default function Page() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [months, setMonths] = useState(3);
  const [subscribing, setSubscribing] = useState(false);
  const [active, setActive] = useState(false);
  const [tx, setTx] = useState('');
  const [error, setError] = useState('');

  const total = useMemo(
    () => parseUnits((Number(pricePerMonth) * months).toFixed(6), 18),
    [months]
  );

  useEffect(() => {
    const check = async () => {
      if (!address || !publicClient) { setActive(false); return; }
      const isActive = await publicClient.readContract({
        address: addresses.subscriptions,
        abi: subscriptionsAbi,
        functionName: 'isActive',
        args: [address, planId],
      });
      setActive(Boolean(isActive));
    };
    check();
  }, [address, publicClient, tx]);

  const onSubscribe = async () => {
    if (!walletClient || !publicClient || !address) return;
    setSubscribing(true); setError('');
    try {
      const hash = await walletClient.writeContract({
        address: addresses.subscriptions,
        abi: subscriptionsAbi,
        functionName: 'subscribe',
        args: [planId, BigInt(months)],
        value: total,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTx(hash);
    } catch (e: any) {
      setError(e.shortMessage || e.message);
    } finally { setSubscribing(false); }
  };

  return (
    <main className="max-w-md mx-auto p-6 pt-10">
      <header className="flex justify-between items-center mb-8">
        <div className="text-sm text-slate-500">Powered by ArcPay</div>
        <ConnectButton />
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold mt-4 text-slate-900">{displayName}</h1>
          <div className="text-slate-500 text-sm">@{creator}</div>
          <p className="mt-3 text-slate-600 leading-relaxed">{bio}</p>
        </div>

        {active ? (
          <div className="p-8 text-center">
            <div className="text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-semibold mb-4">
              ✓ Active subscription
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              You&apos;re in. Access all members-only posts. Unsubscribing refunds
              the unused portion on-chain (per-second accrual).
            </p>
          </div>
        ) : (
          <div className="p-8 space-y-5">
            <div>
              <div className="text-sm text-slate-600 mb-3">Choose duration</div>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setMonths(d)}
                    className={`py-3 rounded-xl font-semibold text-sm border-2 transition ${
                      months === d
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {d}mo
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end justify-between bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500">
                {pricePerMonth} USDC × {months} {months === 1 ? 'month' : 'months'}
              </div>
              <div className="text-2xl font-bold text-slate-900">
                ${formatUnits(total, 18)}
              </div>
            </div>

            {!address ? (
              <div className="text-center py-3 text-slate-500 text-sm">
                Connect your wallet to subscribe
              </div>
            ) : (
              <button
                onClick={onSubscribe}
                disabled={subscribing}
                className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-95 disabled:opacity-60 transition"
              >
                {subscribing ? 'Confirming…' : `Subscribe ${months}mo`}
              </button>
            )}

            {error && (
              <div className="text-red-500 text-sm bg-red-50 py-2 px-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="text-xs text-slate-400 text-center leading-relaxed">
              Cancel anytime · refund for unused time · 98% to creator · 2% protocol
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
