import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          muted: 'var(--color-primary-muted)',
          light: 'var(--color-primary-light)',
          pale: 'var(--color-primary-pale)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        surface: 'var(--color-surface)',
        muted: {
          DEFAULT: 'var(--color-background-muted)',
          foreground: 'var(--color-foreground-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        destructive: 'var(--color-error)',
      },
      spacing: { grid: '8px' },
      borderRadius: {
        xl: 'var(--radius-xl, 1rem)',
        lg: 'var(--radius-lg, 0.75rem)',
        md: 'var(--radius-md, 0.5rem)',
        sm: 'var(--radius-sm, 0.375rem)',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'subtle-dark': '0 1px 3px rgba(0,0,0,0.3)',
        card: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)',
        'card-hover': '0 8px 25px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        glow: '0 4px 14px rgba(37, 99, 235, 0.15)',
        dropdown: '0 12px 36px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
