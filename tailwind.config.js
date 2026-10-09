const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        brand: token('brand'),
        'brand-ink': token('brand-ink'),
        ok: token('ok'),
        warn: token('warn'),
        danger: token('danger'),
        'danger-ink': token('danger-ink'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '14px', ctl: '10px' },
      boxShadow: { pop: '0 12px 32px -12px rgb(0 0 0 / 0.25)' },
    },
  },
  plugins: [],
}
