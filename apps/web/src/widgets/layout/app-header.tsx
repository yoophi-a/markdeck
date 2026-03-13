'use client';

import { Command } from 'lucide-react';
import { Suspense } from 'react';

import { SearchForm } from '@/features/search/ui/search-form';
import { ThemeToggle } from '@/features/theme/ui/theme-toggle';
import { executeDesktopCommand, isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { cn } from '@/shared/lib/utils';
import { AppLink } from '@/shared/ui/app-link';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Separator } from '@/shared/ui/separator';
import { ContentRootSelector } from '@/widgets/layout/content-root-selector';

const appTitle = process.env.MARKDECK_APP_TITLE ?? 'MarkDeck';

export function AppHeader() {
  const desktop = isDesktopRenderer();

  return (
    <header className="topbar">
      <div>
        <AppLink href="/" className="brand">
          {appTitle}
        </AppLink>
        <p className="subtitle">openclaw-workspace markdown browser</p>
      </div>
      <div className="topbar-actions">
        <Suspense fallback={<div className="search-form-placeholder" />}>
          <SearchForm />
        </Suspense>
        <ContentRootSelector />
        {desktop ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void executeDesktopCommand('toggle-command-palette')}>
            <Command className="size-4" />
            Palette
          </Button>
        ) : null}
        <Separator orientation="vertical" className="header-separator hidden h-8 md:block" />
        <nav className="nav">
          <AppLink href="/browse" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'nav-link')}>
            Browse
          </AppLink>
          <AppLink href="/search" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'nav-link')}>
            Search
          </AppLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
