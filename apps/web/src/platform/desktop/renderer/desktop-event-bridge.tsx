'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { executeDesktopCommand, onDesktopCommand, onDesktopContentInvalidated, onDesktopContentRootChanged } from '@/platform/desktop/renderer/desktop-api';
import { desktopQueryKeys, invalidateDesktopContentQueries } from '@/platform/desktop/renderer/desktop-queries';
import { getDesktopHashHref } from '@/shared/lib/app-routes';

function navigateDesktop(href: string) {
  window.location.hash = getDesktopHashHref(href).replace('/#', '#');
}

function focusSearchInput() {
  window.dispatchEvent(new CustomEvent('markdeck:focus-search-input'));
}

function toggleTheme() {
  window.dispatchEvent(new CustomEvent('markdeck:toggle-theme'));
}

function toggleCommandPalette() {
  window.dispatchEvent(new CustomEvent('markdeck:toggle-command-palette'));
}

export function DesktopEventBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeInvalidated = onDesktopContentInvalidated(() => {
      void invalidateDesktopContentQueries(queryClient);
    });

    const unsubscribeRootChanged = onDesktopContentRootChanged((payload) => {
      queryClient.setQueryData(desktopQueryKeys.contentRoot, payload.contentRoot);
      queryClient.setQueryData(desktopQueryKeys.recentContentRoots, payload.recentContentRoots);
      void invalidateDesktopContentQueries(queryClient);
    });

    const unsubscribeCommand = onDesktopCommand((payload) => {
      switch (payload.command) {
        case 'go-home':
          navigateDesktop('/');
          break;
        case 'go-browse':
          navigateDesktop('/browse');
          break;
        case 'go-search':
          navigateDesktop('/search');
          break;
        case 'go-back':
          window.history.back();
          break;
        case 'go-forward':
          window.history.forward();
          break;
        case 'focus-search':
          if (!window.location.hash.startsWith('#/search')) {
            navigateDesktop('/search');
            window.setTimeout(focusSearchInput, 60);
          } else {
            focusSearchInput();
          }
          break;
        case 'toggle-theme':
          toggleTheme();
          break;
        case 'toggle-command-palette':
          toggleCommandPalette();
          break;
        default:
          break;
      }
    });

    const handleRefreshShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void executeDesktopCommand('reload-content');
      }
    };

    window.addEventListener('keydown', handleRefreshShortcut);

    return () => {
      unsubscribeInvalidated();
      unsubscribeRootChanged();
      unsubscribeCommand();
      window.removeEventListener('keydown', handleRefreshShortcut);
    };
  }, [queryClient]);

  return null;
}
