'use client';

import { MoonStar, SunMedium } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/shared/ui/button';

const STORAGE_KEY = 'markdeck-theme';

type ThemeMode = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  function applyTheme(nextTheme: ThemeMode) {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  }

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode = storedTheme === 'dark' ? 'dark' : 'light';

    applyTheme(nextTheme);
    setTheme(nextTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setTheme((currentTheme) => {
        const nextTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
        return nextTheme;
      });
    };

    window.addEventListener('markdeck:toggle-theme', handleToggle as EventListener);
    return () => window.removeEventListener('markdeck:toggle-theme', handleToggle as EventListener);
  }, []);

  function handleToggle() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <Button type="button" variant="outline" className="theme-toggle" onClick={handleToggle} aria-label="Toggle color theme">
      {mounted ? (
        theme === 'dark' ? (
          <>
            <SunMedium className="size-4" />
            <span>Light</span>
          </>
        ) : (
          <>
            <MoonStar className="size-4" />
            <span>Dark</span>
          </>
        )
      ) : (
        'Theme'
      )}
    </Button>
  );
}
