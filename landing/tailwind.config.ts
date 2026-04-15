import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0f',
        paper: '#f7f7fa',
        accent: '#5b5bd6',
        accent2: '#d65b9c',
      },
      backgroundImage: {
        'arc-gradient': 'linear-gradient(135deg, #5b5bd6 0%, #d65b9c 50%, #f59e0b 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
