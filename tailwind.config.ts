import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        confair: {
          navy: '#222c4a',
          'navy-dark': '#1a2340',
          blue: '#407df1',
          'blue-light': '#61bef6',
          gold: '#fbc134',
          'gold-dark': '#e5af2e',
          cream: '#f2eee7',
          muted: '#5a6275',
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
