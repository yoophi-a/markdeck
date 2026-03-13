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

function toggleShortcutHelp() {
  window.dispatchEvent(new CustomEvent('markdeck:toggle-shortcut-help'));
}

function toggleDocumentTree() {
  window.dispatchEvent(new CustomEvent('markdeck:toggle-document-tree'));
}

function toggleDocumentToc() {
  window.dispatchEvent(new CustomEvent('markdeck:toggle-document-toc'));
}

function toggleDocumentMaximize() {
  window.dispatchEvent(new CustomEvent('markdeck:toggle-document-maximize'));
}

export function DesktopEventBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeInvalidated = onDesktopContentInvalidated((payload) => {
      window.dispatchEvent(new CustomEvent('markdeck:content-invalidated-ui', { detail: payload }));
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

    const handleShortcutKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;
      const normalizedKey = event.key.toLowerCase();
      const isSearchRoute = window.location.hash.startsWith('#/search');
      const isDocumentRoute = window.location.hash.startsWith('#/docs/');

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && normalizedKey === 'p') {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && normalizedKey === 'k') {
        event.preventDefault();
        if (!isSearchRoute) {
          navigateDesktop('/search');
          window.setTimeout(focusSearchInput, 60);
        } else {
          focusSearchInput();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && normalizedKey === '/') {
        event.preventDefault();
        toggleShortcutHelp();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && normalizedKey === 'r') {
        event.preventDefault();
        void executeDesktopCommand('reload-content');
        return;
      }

      if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        window.history.back();
        return;
      }

      if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.key === 'ArrowRight') {
        event.preventDefault();
        window.history.forward();
        return;
      }

      if (isTypingTarget) {
        return;
      }

      if (normalizedKey === '?' || normalizedKey === '/') {
        if (!event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          toggleShortcutHelp();
          return;
        }
      }

      if (!isDocumentRoute || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (normalizedKey === 't') {
        event.preventDefault();
        toggleDocumentTree();
        return;
      }

      if (normalizedKey === 'o') {
        event.preventDefault();
        toggleDocumentToc();
        return;
      }

      if (normalizedKey === 'm') {
        event.preventDefault();
        toggleDocumentMaximize();
      }
    };

    window.addEventListener('keydown', handleShortcutKeyDown);

    return () => {
      unsubscribeInvalidated();
      unsubscribeRootChanged();
      unsubscribeCommand();
      window.removeEventListener('keydown', handleShortcutKeyDown);
    };
  }, [queryClient]);

  return null;
}
