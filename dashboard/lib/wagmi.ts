'use client';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { CHAIN } from './config';

export const wagmiConfig = getDefaultConfig({
  appName: 'ArcPay Dashboard',
  projectId: '00000000000000000000000000000000',
  chains: [CHAIN],
  ssr: true,
});
