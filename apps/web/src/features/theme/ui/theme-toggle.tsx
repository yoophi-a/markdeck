'use client';

import { MoonStar, SunMedium } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/shared/ui/button';

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

  useEffect(() => {
    const handleToggle = () => {
      setTheme((currentTheme) => {
        const nextTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = nextTheme;
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
    document.documentElement.dataset.theme = nextTheme;
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
