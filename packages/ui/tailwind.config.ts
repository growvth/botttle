import type { Config } from 'tailwindcss';

/**
 * botttle theme — logo-derived palette (see THEME_DESIGN in docs).
 * Apps can extend this config and add their own content paths.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
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
      spacing: {
        grid: '8px',
      },
      borderRadius: {
        lg: 'var(--radius-lg, 0.5rem)',
        md: 'var(--radius-md, 0.375rem)',
        sm: 'var(--radius-sm, 0.25rem)',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.08)',
        'subtle-dark': '0 1px 3px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
