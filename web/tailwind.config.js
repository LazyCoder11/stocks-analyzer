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
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

