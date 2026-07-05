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
      // Text-safe accent shades for small text / links on light (white/beige)
      // backgrounds. The bright brand accents (cblue/lblue/yellow) fail WCAG AA
      // as small text on white, so use these darker, same-family shades for
      // labels and links; keep the bright tokens for icons, chips, buttons and
      // large display. Verified ≥4.5:1 on both white and beige.
      colors: {
        cblue: { 700: '#2358c0' }, // aviation + eyebrow/link text on light
        'accent-maritime': '#146685', // darkened lblue for maritime link text
        'accent-offshore': '#806300', // dark amber for offshore link text
      },
    },
  },
  plugins: [typography],
};

export default config;
