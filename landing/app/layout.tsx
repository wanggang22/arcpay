import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-fraunces',
});

export const metadata: Metadata = {
  title: 'ArcPay — USDC payments on Arc',
  description: 'Tips, subscriptions, paywalls, and pay-per-call billing on Arc Network. The Stripe of USDC.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-paper text-ink font-sans antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
