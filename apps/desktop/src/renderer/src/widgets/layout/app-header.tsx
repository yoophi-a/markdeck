'use client';

import { Command, Settings2 } from 'lucide-react';
import { Suspense } from 'react';

import { SearchForm } from '@/features/search/ui/search-form';
import { executeDesktopCommand } from '@/platform/desktop/renderer/desktop-api';
import { toSettingsHref } from '@/shared/lib/routes';
import { DesktopRefreshStatus } from '@/widgets/desktop/refresh-status/ui/desktop-refresh-status';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import { cn } from '@/shared/lib/utils';
import { AppLink } from '@/shared/ui/app-link';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Separator } from '@/shared/ui/separator';

const appTitle = import.meta.env.VITE_MARKDECK_APP_TITLE ?? 'MarkDeck';

export function AppHeader() {
  const desktop = useDesktopRenderer();

  return (
    <header className="topbar">
      <div>
        <AppLink href="/" className="brand">
          {appTitle}
        </AppLink>
      </div>
      <div className="topbar-actions">
        <Suspense fallback={<div className="search-form-placeholder" />}>
          <SearchForm />
        </Suspense>
        <DesktopRefreshStatus />
        {desktop ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title="Palette ⌘⇧P"
            aria-label="Palette ⌘⇧P"
            onClick={() => void executeDesktopCommand('toggle-command-palette')}
          >
            <Command className="size-4" />
          </Button>
        ) : null}
        <AppLink
          href={toSettingsHref()}
          title="Settings"
          aria-label="Settings"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'nav-link')}
        >
          <Settings2 className="size-4" />
        </AppLink>
        <Separator orientation="vertical" className="header-separator hidden h-8 md:block" />
        <nav className="nav">
          <AppLink href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'nav-link')}>
            Browse
          </AppLink>
          <AppLink href="/search" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'nav-link')}>
            Search
          </AppLink>
        </nav>
      </div>
    </header>
  );
}
