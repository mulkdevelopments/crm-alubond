import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Alubond brand
        brand: {
          50: '#FFF1F1',
          100: '#FFDFDF',
          200: '#FFC5C5',
          300: '#FF9D9D',
          400: '#FF6464',
          500: '#FF2E2E',
          600: '#E30613', // primary Alubond red
          700: '#BE0411',
          800: '#9C0815',
          900: '#810B18',
          950: '#470106',
        },
        ink: {
          50: '#F7F7F8',
          100: '#EEEEF0',
          200: '#D9D9DD',
          300: '#B7B7BD',
          400: '#8E8E96',
          500: '#6E6E76',
          600: '#54545C',
          700: '#3F3F46',
          800: '#27272C',
          900: '#18181B',
          950: '#0A0A0B',
        },
        success: { DEFAULT: '#10B981', soft: '#D1FAE5' },
        warning: { DEFAULT: '#F59E0B', soft: '#FEF3C7' },
        danger: { DEFAULT: '#EF4444', soft: '#FEE2E2' },
        info: { DEFAULT: '#3B82F6', soft: '#DBEAFE' },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card': '0 1px 3px rgb(0 0 0 / 0.04), 0 4px 12px -2px rgb(0 0 0 / 0.06)',
        'pop': '0 8px 24px -4px rgb(0 0 0 / 0.12), 0 4px 8px -2px rgb(0 0 0 / 0.06)',
        'brand': '0 8px 24px -8px rgb(227 6 19 / 0.4)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
};

export default config;
