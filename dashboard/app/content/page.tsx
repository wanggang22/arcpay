'use client';
import { Header } from '@/components/Header';

export default function ContentPage() {
  return (
    <div>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold">Paywalled Content</h1>
        <p className="text-muted mt-2">Coming in v0.2 — add gated articles/videos</p>
      </main>
    </div>
  );
}
