'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arcLocal, arcTestnet } from '@wanggang22/arcpay-sdk';
import { useState } from 'react';

const network = (process.env.NEXT_PUBLIC_NETWORK || 'local') as 'local' | 'testnet';
const chain = network === 'testnet' ? arcTestnet : arcLocal;

const wagmiConfig = getDefaultConfig({
  appName: '{{projectName}}',
  projectId: '00000000000000000000000000000000',
  chains: [chain],
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
