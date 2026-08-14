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
      // Fontes/radios/sombras apontam para tokens do Theme Engine: qualquer tema
      // redefine as variáveis e TODOS os componentes existentes mudam junto,
      // sem reescrever nenhum componente.
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-sans)',
        reader: 'var(--font-reader)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-xl)',
      },
      maxWidth: {
        prose2: '68ch',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        deep: 'var(--shadow-deep)',
        spine: 'var(--shadow-spine)',
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
