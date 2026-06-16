/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#00ff87',
        'neon-cyan': '#00d4ff',
        'neon-purple': '#bf5fff',
        'neon-amber': '#ffb800',
        'neon-red': '#ff3d5a',
        'text-2': '#7a7a7a',
        'text-3': '#444444',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-green-sm': '0 0 6px #00ff87',
        'neon-green-lg': '0 0 16px rgba(0, 255, 135, 0.12)',
        'neon-cyan-lg': '0 0 16px rgba(0, 212, 255, 0.12)',
        'neon-green-xl': '0 0 24px rgba(0, 255, 135, 0.08)',
        'neon-green-focus': '0 0 0 3px rgba(0, 255, 135, 0.05)',
      },
    },
  },
  plugins: [],
}

