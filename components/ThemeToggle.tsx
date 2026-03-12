'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'markdeck-theme';

type ThemeMode = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode = storedTheme === 'light' ? 'light' : 'dark';

    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    setMounted(true);
  }, []);

  function handleToggle() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <button type="button" className="theme-toggle" onClick={handleToggle} aria-label="Toggle color theme">
      {mounted ? (theme === 'dark' ? '☀️ Light' : '🌙 Dark') : 'Theme'}
    </button>
  );
}
