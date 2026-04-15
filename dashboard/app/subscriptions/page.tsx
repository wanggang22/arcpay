'use client';
import { Header } from '@/components/Header';

export default function SubsPage() {
  return (
    <div>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted mt-2">Coming in v0.2 — create plans, view subscribers, withdraw revenue</p>
      </main>
    </div>
  );
}
