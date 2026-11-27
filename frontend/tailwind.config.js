/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          950: '#070a10',
          900: '#0d121c',
          850: '#131a28',
          800: '#1a2335',
        },
        auctionme: {
          darkBg: '#0b1015',
          darkPanel: '#10161d',
          darkInput: '#161e27',
          darkBorder: '#27323f',
          lightBg: '#f4f7f6',
          lightPanel: '#ffffff',
          lightInput: '#ffffff',
          lightBorder: '#d3dce4',
          emeraldDark: '#5ce1a0',
          emeraldDarkHover: '#45d48f',
          emeraldLight: '#117a52',
          emeraldLightHover: '#0d6544',
          dangerDark: '#f87171',
          dangerLight: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};
