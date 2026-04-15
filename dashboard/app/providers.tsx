'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyConfig } from '@privy-io/wagmi';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CHAIN } from '@/lib/config';
import { useState } from 'react';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

// Privy app IDs follow a specific format (cm... or similar). Detect placeholder.
const HAS_PRIVY = PRIVY_APP_ID.length >= 20 && !PRIVY_APP_ID.includes('demo') && !PRIVY_APP_ID.includes('replace');

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());

  if (HAS_PRIVY) {
    const wagmiConfig = createPrivyConfig({
      chains: [CHAIN] as any,
      transports: { [CHAIN.id]: http() },
    });
    return (
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ['email', 'google', 'twitter', 'wallet'],
          appearance: { theme: 'light', accentColor: '#5b5bd6' },
          embeddedWallets: { createOnLogin: 'users-without-wallets' },
          defaultChain: CHAIN as any,
          supportedChains: [CHAIN] as any,
        }}>
        <QueryClientProvider client={qc}>
          <PrivyWagmiProvider config={wagmiConfig}>
            {children}
          </PrivyWagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    );
  }

  // Fallback: pure wagmi with injected (MetaMask) connector
  const fallbackConfig = createConfig({
    chains: [CHAIN] as any,
    transports: { [CHAIN.id]: http() },
    connectors: [injected()],
  });
  return (
    <QueryClientProvider client={qc}>
      <WagmiProvider config={fallbackConfig}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}
