/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bl: {
          dark: '#070a12',
          card: '#0f172a',
          cardBorder: '#1e293b',
          surface: '#172033',
          surfaceHover: '#202d46',
          primary: '#00d2ff',
          primaryHover: '#38bdf8',
          accent: '#2563eb',
          neon: '#00f0ff',
          muted: '#94a3b8',
          subtle: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0, 210, 255, 0.25)',
        'neon': '0 0 20px rgba(0, 210, 255, 0.35)',
        'neon-strong': '0 0 30px rgba(0, 210, 255, 0.55)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
