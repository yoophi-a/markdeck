'use client';

import { Eye, EyeClosed } from 'lucide-react';
import { useEffect, useState } from 'react';

import { executeDesktopCommand } from '@/platform/desktop/renderer/desktop-api';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import { Button } from '@/shared/ui/button';

export function DesktopRefreshStatus() {
  const desktopRenderer = useDesktopRenderer();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!desktopRenderer) {
      return;
    }

    const handleRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ changedAt?: string }>).detail;
      setLastRefreshedAt(detail?.changedAt ?? new Date().toISOString());
    };

    window.addEventListener('markdeck:content-invalidated-ui', handleRefresh as EventListener);
    return () => window.removeEventListener('markdeck:content-invalidated-ui', handleRefresh as EventListener);
  }, [desktopRenderer]);

  if (!desktopRenderer) {
    return null;
  }

  const statusLabel = lastRefreshedAt ? `Auto refreshed ${formatRelativeTime(lastRefreshedAt)}` : 'Watcher active';

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="desktop-refresh-status"
      onClick={() => void executeDesktopCommand('reload-content')}
      title={statusLabel}
      aria-label={statusLabel}
    >
      {lastRefreshedAt ? <Eye className="size-4" /> : <EyeClosed className="size-4" />}
    </Button>
  );
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 5_000) {
    return 'just now';
  }

  const seconds = Math.floor(diffMs / 1_000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
