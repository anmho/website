'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getSavedTheme(fallbackTheme: Theme): Theme {
  if (typeof window === 'undefined') {
    return fallbackTheme;
  }

  try {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : fallbackTheme;
  } catch {
    return fallbackTheme;
  }
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Keep the in-memory theme change even if storage is unavailable.
  }

  document.cookie = [
    `theme=${theme}`,
    'path=/',
    `max-age=${THEME_COOKIE_MAX_AGE}`,
    'samesite=lax',
  ].join('; ');
}

export function ThemeProvider({
  children,
  initialTheme = 'dark',
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const savedTheme = getSavedTheme(initialTheme);
    setTheme(savedTheme);
    persistTheme(savedTheme);
  }, [initialTheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    persistTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`min-h-screen ${theme}`} suppressHydrationWarning>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
