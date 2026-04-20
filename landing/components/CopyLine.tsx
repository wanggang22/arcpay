'use client';
import { useState } from 'react';

export function CopyLine({ text, prefix = '$' }: { text: string; prefix?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-hairline bg-ink/5 hover:bg-ink/10 font-mono text-sm text-ink transition"
      aria-label={`Copy ${text}`}
    >
      <span className="text-ink/40">{prefix}</span>
      <span>{text}</span>
      <span className="text-ink/40 ml-1 text-xs">
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  );
}
