import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        paper: 'var(--paper)',
        card: 'var(--card)',
        card2: 'var(--card2)',
        ink: 'var(--ink)',
        mute: 'var(--ink-soft)',
        faint: 'var(--ink-faint)',
        line: 'var(--line)',
        wine: 'var(--wine)',
        winelt: 'var(--wine-light)',
        pine: 'var(--pine)',
        gold: 'var(--gold)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        reader: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
      },
      maxWidth: {
        prose2: '68ch',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,22,14,.05), 0 12px 32px -18px rgba(28,22,14,.28)',
        deep: '0 2px 6px rgba(15,10,5,.12), 0 28px 60px -24px rgba(15,10,5,.45)',
        spine: 'inset 3px 0 6px -2px rgba(0,0,0,.35), inset -2px 0 4px -2px rgba(255,255,255,.12)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(.6deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        glowpulse: {
          '0%,100%': { opacity: '.55' },
          '50%': { opacity: '.9' },
        },
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        glowpulse: 'glowpulse 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
