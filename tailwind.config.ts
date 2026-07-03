import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
// Brand colors + fonts live in the shared preset (mirrored in the
// confair-platform repo -- see the note in that file before editing values).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const confairPreset = require('./tailwind.confair-preset');

const config: Config = {
  presets: [confairPreset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [typography],
};

export default config;
