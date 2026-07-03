/**
 * Confair brand tokens — the single source of truth for brand colors and
 * type across Confair frontends. This file is mirrored byte-for-byte in:
 *
 *   confair-platform/tailwind.confair-preset.js
 *   website/tailwind.confair-preset.js
 *
 * If you change a value here, change it in the other repo in the same
 * change set. Each repo's tailwind.config consumes it via `presets: [...]`.
 *
 * Status colors are deliberately NOT brand tokens — use Tailwind's
 * `emerald` (success), `amber` (warning) and `red` (danger) directly.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#222c4a',
          800: '#1a2340', // darkest — website header hover states
          700: '#2d3a5c',
          600: '#3d4f7a',
          500: '#5a6275', // muted body text on light backgrounds
          400: '#6b7fa8',
          200: '#a8b4cc',
          100: '#dde3ef',
        },
        yellow: {
          DEFAULT: '#fbc134',
          600: '#e5af2e', // website CTA hover
          dark: '#d49a10', // platform button hover
          light: '#fef5db',
        },
        cblue: { DEFAULT: '#407df1', light: '#e8f0fe' },
        lblue: { DEFAULT: '#61bef6', light: '#e4f5fe' },
        beige: { DEFAULT: '#f2eee7' },
      },
      fontFamily: {
        // The consuming app must load the webfonts itself (the platform
        // does via globals.css); without them these fall back to system-ui.
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
};
