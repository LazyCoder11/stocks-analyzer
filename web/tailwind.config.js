/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-green':  '#059669',
        'accent-red':    '#dc2626',
        'accent-indigo': '#6366f1',
        'accent-amber':  '#d97706',
        'accent-cyan':   '#0891b2',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'xs':  '0 1px 2px rgba(15,23,42,0.04)',
        'card': '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        'elevated': '0 4px 12px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.04)',
        'panel': '0 8px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.04)',
        'modal': '0 16px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)',
      },
      borderColor: {
        DEFAULT: '#e2e8f0',
      },
    },
  },
  plugins: [],
}
