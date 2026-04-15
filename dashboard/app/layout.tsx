import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ArcPay Dashboard',
  description: 'Manage your ArcPay creator account',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-ink min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
