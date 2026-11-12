/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05070f',
          900: '#0a0e1a',
          850: '#0e1322',
          800: '#121829',
          700: '#1b2236',
          600: '#283049',
        },
        brand: {
          50: '#eef1ff',
          100: '#e0e5ff',
          200: '#c6cdff',
          300: '#a3abff',
          400: '#7f84fb',
          500: '#6366f1',
          600: '#5146e5',
          700: '#4438c9',
          800: '#3830a3',
          900: '#312e81',
        },
        signal: {
          cyan: '#22d3ee',
          violet: '#a78bfa',
          mint: '#34d399',
        },
      },
      // Legacy utilities used across existing pages (Tailwind v4 names) mapped for v3
      boxShadow: {
        '2xs': '0 1px 1px 0 rgb(15 23 42 / 0.04)',
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -6px rgb(15 23 42 / 0.08)',
        lift: '0 2px 4px rgb(15 23 42 / 0.04), 0 18px 40px -12px rgb(15 23 42 / 0.18)',
        glow: '0 0 0 1px rgb(99 102 241 / 0.25), 0 10px 40px -10px rgb(99 102 241 / 0.55)',
      },
      spacing: {
        4.5: '1.125rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        typing: {
          '0%, 80%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '40%': { opacity: '1', transform: 'translateY(-2px)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out both',
        fadeUp: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        orbit: 'orbit 18s linear infinite',
        pulseRing: 'pulseRing 2s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        typing: 'typing 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}