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
    extend: {
      // Bind the webfonts loaded via next/font (see app/layout.tsx) to the
      // brand font tokens. Falls back to the preset's system-ui stack if the
      // variables are ever absent. The shared preset is intentionally not
      // edited here — this override is website-local.
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-poppins)', 'Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
};

export default config;
