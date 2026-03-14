import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'botttle-theme',
}: ThemeProviderProps): ReactNode {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') return defaultTheme;
    const stored = document.documentElement.getAttribute('data-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    const fromStorage = localStorage.getItem(storageKey) as Theme | null;
    if (fromStorage === 'light' || fromStorage === 'dark') {
      document.documentElement.setAttribute('data-theme', fromStorage);
      return fromStorage;
    }
    document.documentElement.setAttribute('data-theme', defaultTheme);
    return defaultTheme;
  });

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(storageKey, next);
      }
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
