'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Suspense } from 'react';

import { SearchForm } from '@/features/search/ui/search-form';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button';
import { Separator } from '@/shared/ui/separator';
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
        <Separator orientation="vertical" className="header-separator hidden h-8 md:block" />
        <nav className="nav">
          <Link href={'/browse' as Route} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'nav-link')}>
            Browse
          </Link>
          <Link href={'/search' as Route} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'nav-link')}>
            Search
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
