import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f7f7fa',
        panel: '#ffffff',
        border: '#e5e7eb',
        ink: '#0a0a0f',
        muted: '#6b7280',
        accent: '#5b5bd6',
        accent2: '#d65b9c',
      },
      backgroundImage: {
        'arc-gradient': 'linear-gradient(135deg, #5b5bd6 0%, #d65b9c 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
