'use client';
import { useEffect, useRef } from 'react';

export function Convergence() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = svg.querySelectorAll<SVGPathElement>('path[data-animate]');
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      p.style.transition = `stroke-dashoffset 1.2s ease-out ${i * 0.08}s`;
      requestAnimationFrame(() => {
        p.style.strokeDashoffset = '0';
      });
    });
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 520 520" className="w-full h-auto" aria-hidden="true">
      <SourcePill x={80} y={60} label="tweet" />
      <SourcePill x={440} y={60} label="/article" />
      <SourcePill x={80} y={460} label="curl" />
      <SourcePill x={440} y={460} label="agent.py" />

      <path data-animate d="M 80 76 C 160 180, 220 220, 260 252" fill="none" stroke="#0a0a0f" strokeOpacity="0.22" strokeWidth="1.5" />
      <path data-animate d="M 440 76 C 360 180, 300 220, 260 252" fill="none" stroke="#0a0a0f" strokeOpacity="0.22" strokeWidth="1.5" />
      <path data-animate d="M 80 444 C 160 340, 220 300, 260 268" fill="none" stroke="#0a0a0f" strokeOpacity="0.22" strokeWidth="1.5" />
      <path data-animate d="M 440 444 C 360 340, 300 300, 260 268" fill="none" stroke="#0a0a0f" strokeOpacity="0.22" strokeWidth="1.5" />

      <g transform="translate(260,260)">
        <rect x="-150" y="-26" width="300" height="52" rx="26" fill="#2d4a3e" fillOpacity="0.06" stroke="#2d4a3e" strokeWidth="1.5" />
        <text x="0" y="6" textAnchor="middle" fill="#0a0a0f">
          <tspan fontFamily="var(--font-geist-mono)" fontSize="17" letterSpacing="-0.01em">arcpay.finance/</tspan>
          <tspan fontFamily="var(--font-fraunces)" fontStyle="italic" fontSize="19" fill="#2d4a3e">@gavin</tspan>
        </text>
      </g>
    </svg>
  );
}

function SourcePill({ x, y, label }: { x: number; y: number; label: string }) {
  const w = label.length * 8 + 28;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w / 2} y="-16" width={w} height="32" rx="16" fill="#f7f4ee" stroke="#0a0a0f" strokeOpacity="0.18" strokeWidth="1" />
      <text x="0" y="5" textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="13" fill="#0a0a0f">{label}</text>
    </g>
  );
}
