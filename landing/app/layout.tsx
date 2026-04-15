import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArcPay — USDC payments on Arc',
  description: 'Tips, subscriptions, paywalls, and pay-per-call billing on Arc Network. The Stripe of USDC.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased min-h-screen">{children}</body>
    </html>
  );
}
