import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Premium content — {{projectName}}',
  description: 'Pay-once, own-forever content gated with USDC on Arc',
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
