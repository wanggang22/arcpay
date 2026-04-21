import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f7f4ee',
        panel: '#ffffff',
        border: 'rgba(10,10,15,0.10)',
        ink: '#0a0a0f',
        muted: 'rgba(10,10,15,0.55)',
        accent: '#2d4a3e',
        gold: '#b8a47e',
        hairline: 'rgba(10,10,15,0.10)',
        paper: '#f7f4ee',
        /** @deprecated preserve to avoid silent breaks during palette cascade */
        accent2: '#d65b9c',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia'],
      },
      backgroundImage: {
        /** @deprecated */
        'arc-gradient': 'linear-gradient(135deg, #2d4a3e 0%, #1f3a2e 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
