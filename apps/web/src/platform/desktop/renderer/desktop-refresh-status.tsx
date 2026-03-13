'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { executeDesktopCommand, isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';

export function DesktopRefreshStatus() {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktopRenderer()) {
      return;
    }

    const handleRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ changedAt?: string }>).detail;
      setLastRefreshedAt(detail?.changedAt ?? new Date().toISOString());
    };

    window.addEventListener('markdeck:content-invalidated-ui', handleRefresh as EventListener);
    return () => window.removeEventListener('markdeck:content-invalidated-ui', handleRefresh as EventListener);
  }, []);

  if (!isDesktopRenderer()) {
    return null;
  }

  return (
    <button type="button" className="desktop-refresh-status" onClick={() => void executeDesktopCommand('reload-content')}>
      <RefreshCw className="size-4" />
      <span>{lastRefreshedAt ? `Auto refreshed ${formatRelativeTime(lastRefreshedAt)}` : 'Watcher active'}</span>
    </button>
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
