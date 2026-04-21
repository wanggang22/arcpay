import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Subscribe — {{projectName}}',
  description: 'Monthly USDC subscriptions with per-second accrual on Arc',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
