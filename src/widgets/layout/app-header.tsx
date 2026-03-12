import Link from 'next/link';
import type { Route } from 'next';
import { Suspense } from 'react';

import { SearchForm } from '@/features/search/ui/search-form';
import { ThemeToggle } from '@/features/theme/ui/theme-toggle';

const appTitle = process.env.MARKDECK_APP_TITLE ?? 'MarkDeck';

export function AppHeader() {
  return (
    <header className="topbar">
      <div>
        <Link href={'/' as Route} className="brand">
          {appTitle}
        </Link>
        <p className="subtitle">openclaw-workspace markdown browser</p>
      </div>
      <div className="topbar-actions">
        <Suspense fallback={<div className="search-form-placeholder" />}>
          <SearchForm />
        </Suspense>
        <nav className="nav">
          <Link href={'/browse' as Route}>Browse</Link>
          <Link href={'/search' as Route}>Search</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
