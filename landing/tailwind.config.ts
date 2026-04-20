import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0f',
        paper: '#f7f4ee',
        accent: '#2d4a3e',
        gold: '#b8a47e',
        hairline: 'rgba(10,10,15,0.10)',
        /** @deprecated kept for sub-pages during landing-redesign follow-up */
        accent2: '#d65b9c',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia'],
      },
      backgroundImage: {
        /** @deprecated kept for sub-pages during landing-redesign follow-up */
        'arc-gradient': 'linear-gradient(135deg, #5b5bd6 0%, #d65b9c 50%, #f59e0b 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
