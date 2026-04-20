'use client';
import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits } from 'viem';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
export const HAS_PRIVY =
  PRIVY_APP_ID.length >= 20 && !PRIVY_APP_ID.includes('demo') && !PRIVY_APP_ID.includes('replace');

type Theme = 'light' | 'dark';

export interface SocialIdent {
  source: 'twitter' | 'google' | 'discord' | 'farcaster' | 'github' | 'email' | 'apple';
  label: string;
  avatar?: string;
}

export function identityFromPrivyUser(user: any): SocialIdent | null {
  if (!user) return null;
  if (user.twitter?.username) return { source: 'twitter', label: `@${user.twitter.username}`, avatar: user.twitter.profilePictureUrl };
  if (user.google?.email) return { source: 'google', label: user.google.name || user.google.email };
  if (user.discord?.username) return { source: 'discord', label: user.discord.username };
  if (user.farcaster?.username) return { source: 'farcaster', label: `@${user.farcaster.username}`, avatar: user.farcaster.pfp };
  if (user.github?.username) return { source: 'github', label: user.github.username };
  if (user.apple?.email) return { source: 'apple', label: user.apple.email };
  if (user.email?.address) return { source: 'email', label: user.email.address };
  return null;
}

function sourceEmoji(s: SocialIdent['source']): string {
  return (
    { twitter: '𝕏', google: 'G', discord: '💬', farcaster: 'ᶠ', github: '⌨', apple: '', email: '✉' } as Record<
      SocialIdent['source'],
      string
    >
  )[s] || '';
}

/**
 * Unified auth UI for any ArcPay page.
 *   - Light theme: white/gray pill, for blog / product / creator pages
 *   - Dark theme: gray-900 pill, for agent / terminal-like pages
 *   - Loading, Sign in, and signed-in dropdown variants
 *   - Dropdown shows full identity, click-to-copy wallet, sign out
 */
export function AuthPill({ theme = 'light' }: { theme?: Theme }) {
  if (!HAS_PRIVY) return <WagmiAuthFallback theme={theme} />;
  return <PrivyAuthPill theme={theme} />;
}

function PrivyAuthPill({ theme }: { theme: Theme }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);

  const dark = theme === 'dark';
  const pillBg = dark ? 'bg-gray-900 border-gray-800 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300';
  const labelClr = dark ? 'text-gray-100' : 'text-gray-900';
  const mutedClr = dark ? 'text-gray-500' : 'text-gray-500';

  if (!ready) {
    return (
      <div className={`w-8 h-8 rounded-full animate-pulse ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} aria-label="Loading auth" />
    );
  }
  if (!authenticated) {
    return (
      <button
        onClick={() => login()}
        className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition
          ${dark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
      >
        Sign in
      </button>
    );
  }

  const ident = identityFromPrivyUser(user) || { source: 'email' as const, label: 'Signed in' };
  const wallet = wallets[0];
  const short = wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : '';
  const full = wallet?.address || '';

  const copy = async () => {
    if (!full) return;
    try { await navigator.clipboard.writeText(full); } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition ${pillBg}`}
      >
        {ident.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ident.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
            {sourceEmoji(ident.source) || '✓'}
          </div>
        )}
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className={`text-xs font-bold truncate max-w-[120px] ${labelClr}`}>{ident.label}</span>
          {short && <span className={`text-[10px] font-mono ${mutedClr}`}>{short}</span>}
        </div>
        <svg viewBox="0 0 20 20" className={`w-3 h-3 hidden md:block ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="currentColor">
          <path d="M5 8l5 5 5-5H5z" />
        </svg>
      </button>

      {open && (
        <>
          <button
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
          />
          <div
            className={`absolute right-0 top-full mt-1 w-60 rounded-xl shadow-xl z-20 overflow-hidden border
              ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
          >
            <div className={`p-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={`text-xs uppercase tracking-wider ${mutedClr}`}>Signed in as</div>
              <div className={`mt-1 font-bold text-sm truncate ${labelClr}`}>{ident.label}</div>
            </div>
            {wallet && (
              <button
                onClick={copy}
                className={`w-full p-3 text-left border-b ${dark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <div className={`text-xs uppercase tracking-wider ${mutedClr}`}>Wallet</div>
                <div className={`mt-1 font-mono text-xs truncate ${labelClr}`} title={full}>
                  {short}
                </div>
                <WalletBalance address={full as `0x${string}`} muted={dark ? 'text-gray-500' : 'text-gray-500'} />
                <div className="text-[10px] text-accent mt-0.5">Click to copy full address</div>
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className={`w-full p-3 text-left text-xs font-bold
                ${dark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function WalletBalance({ address, muted }: { address: `0x${string}` | ''; muted: string }) {
  const { data } = useBalance({ address: address || undefined });
  if (!data) return null;
  return (
    <div className={`mt-1 text-[10px] font-mono ${muted}`}>
      {Number(formatUnits(data.value, 18)).toFixed(4)} USDC
    </div>
  );
}

/**
 * wagmi fallback when no Privy: plain Connect / Disconnect button.
 * Useful for local dev or when Privy App ID is a placeholder.
 */
function WagmiAuthFallback({ theme }: { theme: Theme }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const dark = theme === 'dark';

  if (!isConnected) {
    return (
      <button
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
        className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition
          ${dark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
      >
        Connect wallet
      </button>
    );
  }
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-mono ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{short}</span>
      <button onClick={() => disconnect()} className={`text-[10px] ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
        Sign out
      </button>
    </div>
  );
}
