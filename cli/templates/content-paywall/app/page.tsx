'use client';
import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, keccak256, toHex, formatUnits } from 'viem';
import { NETWORKS, contentPaywallAbi } from '@wanggang22/arcpay-sdk';

const contentTitle = process.env.NEXT_PUBLIC_CONTENT_TITLE || 'The Hidden History of Stablecoins';
const contentSlug = process.env.NEXT_PUBLIC_CONTENT_SLUG || 'stablecoin-history';
const creator = process.env.NEXT_PUBLIC_CREATOR_USERNAME || 'alice';
const priceUsdc = process.env.NEXT_PUBLIC_PRICE_USDC || '0.05';
const network = (process.env.NEXT_PUBLIC_NETWORK || 'local') as 'local' | 'testnet';
const addresses = NETWORKS[network].addresses;

const contentId = keccak256(toHex(contentSlug));
const price = parseUnits(priceUsdc, 18);

const preview = `Stablecoins didn't emerge from crypto. They emerged from a question banks had been asking since the 1970s: what if dollars could move at internet speed?\n\nThe first serious answer came not from a blockchain, but from a small team at...`;

const locked = `...the Federal Reserve. Their 1991 memo — never published — proposed a real-time dollar settlement network that would cut interbank fees by 80%. It was shelved after industry lobbying.\n\nWhat followed was 30 years of workarounds. ACH (1972), Fedwire (1976), SWIFT (1977). Each solved a slice. None solved the core problem.\n\nUSDC in 2018 didn't invent anything new. It made a 30-year-old idea finally deployable — because the distribution layer (Ethereum, then every chain) was finally cheap enough to matter.\n\nCircle's Arc Network, launched in 2026, is the logical conclusion: the Fed's 1991 memo, built in public, on hardware that can settle 0.5 seconds per dollar. The irony? It took crypto to prove the central banks right.`;

export default function Page() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [tx, setTx] = useState('');

  useEffect(() => {
    const check = async () => {
      if (!address || !publicClient) { setHasAccess(false); return; }
      setChecking(true);
      try {
        const owned = await publicClient.readContract({
          address: addresses.contentPaywall,
          abi: contentPaywallAbi,
          functionName: 'checkAccess',
          args: [contentId, address],
        });
        setHasAccess(Boolean(owned));
      } finally { setChecking(false); }
    };
    check();
  }, [address, publicClient, tx]);

  const onPurchase = async () => {
    if (!walletClient || !publicClient || !address) return;
    setPurchasing(true); setError('');
    try {
      const hash = await walletClient.writeContract({
        address: addresses.contentPaywall,
        abi: contentPaywallAbi,
        functionName: 'purchase',
        args: [contentId],
        value: price,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTx(hash);
    } catch (e: any) {
      setError(e.shortMessage || e.message);
    } finally { setPurchasing(false); }
  };

  return (
    <main className="max-w-2xl mx-auto p-6 pt-10">
      <header className="flex justify-between items-center mb-10">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">@{creator}</span> · premium
        </div>
        <ConnectButton />
      </header>

      <article className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
          {contentTitle}
        </h1>
        <div className="text-sm text-slate-500 mb-8">
          ~8 min read · ${priceUsdc} USDC to unlock
        </div>

        <div className="prose text-slate-700 leading-relaxed whitespace-pre-line">
          {preview}
        </div>

        {hasAccess ? (
          <>
            <div className="my-6 py-3 px-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold flex items-center gap-2">
              ✓ You own this article. On-chain receipt active.
            </div>
            <div className="prose text-slate-700 leading-relaxed whitespace-pre-line">
              {locked}
            </div>
          </>
        ) : (
          <div className="my-10 border-t border-slate-200 pt-8">
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-8 text-center">
              <div className="text-sm text-slate-500 mb-2">Continue reading</div>
              <div className="text-3xl font-bold text-slate-900 mb-6">
                ${priceUsdc} <span className="text-slate-400 font-normal text-lg">USDC</span>
              </div>
              {!address ? (
                <div className="text-sm text-slate-500">Connect your wallet to unlock</div>
              ) : (
                <button
                  onClick={onPurchase}
                  disabled={purchasing || checking}
                  className="px-8 py-3 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-700 disabled:opacity-60 transition"
                >
                  {purchasing ? 'Confirming…' : `Unlock for $${priceUsdc}`}
                </button>
              )}
              <div className="mt-4 text-xs text-slate-400">
                One-time payment · Access is an on-chain receipt · Works forever
              </div>
              {error && (
                <div className="mt-4 text-xs text-red-500 bg-red-50 py-2 px-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </article>

      <footer className="text-center text-xs text-slate-400 mt-8">
        Powered by ArcPay · contentId {contentId.slice(0, 10)}…
      </footer>
    </main>
  );
}
