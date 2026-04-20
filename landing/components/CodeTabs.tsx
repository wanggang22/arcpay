'use client';
import { useState } from 'react';

export type CodeTab = { label: string; code: string };

export function CodeTabs({ tabs, initial = 0 }: { tabs: CodeTab[]; initial?: number }) {
  const [active, setActive] = useState(initial);
  const current = tabs[active] ?? tabs[0];
  return (
    <div className="rounded-2xl border border-hairline bg-ink text-paper overflow-hidden">
      {tabs.length > 1 && (
        <div className="flex items-center border-b border-white/10 overflow-x-auto">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              className={`px-4 py-2.5 text-xs font-mono transition whitespace-nowrap ${
                i === active ? 'text-paper border-b-2 border-[#b8a47e]' : 'text-paper/50 hover:text-paper/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <pre className="p-5 md:p-6 font-mono text-xs md:text-sm overflow-x-auto leading-relaxed">
        <code>{current.code}</code>
      </pre>
    </div>
  );
}
