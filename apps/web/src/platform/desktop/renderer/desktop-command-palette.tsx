'use client';

import { useEffect, useMemo, useState } from 'react';

import { executeDesktopCommand } from '@/platform/desktop/renderer/desktop-api';
import { useDesktopRecentContentRootsQuery } from '@/platform/desktop/renderer/desktop-queries';

interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  run: () => void | Promise<unknown>;
}

export function DesktopCommandPalette() {
  const recentRootsQuery = useDesktopRecentContentRootsQuery(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const openPalette = () => {
      setOpen((current) => !current);
      setQuery('');
    };

    const closePalette = () => {
      setOpen(false);
      setQuery('');
    };

    const handleToggle = () => openPalette();
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        openPalette();
      }

      if (event.key === 'Escape') {
        closePalette();
      }
    };

    window.addEventListener('markdeck:toggle-command-palette', handleToggle as EventListener);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('markdeck:toggle-command-palette', handleToggle as EventListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const baseActions: CommandPaletteAction[] = [
      { id: 'open-folder', title: 'Open folder…', subtitle: 'Content root 선택', run: () => executeDesktopCommand('open-content-root') },
      { id: 'browse', title: 'Go to Browse', subtitle: '문서 폴더 탐색', run: () => executeDesktopCommand('go-browse') },
      { id: 'search', title: 'Go to Search', subtitle: '검색 화면으로 이동', run: () => executeDesktopCommand('go-search') },
      { id: 'home', title: 'Go to Home', subtitle: 'desktop 홈으로 이동', run: () => executeDesktopCommand('go-home') },
      { id: 'focus-search', title: 'Focus search', subtitle: '검색 입력창 포커스', run: () => executeDesktopCommand('focus-search') },
      { id: 'toggle-theme', title: 'Toggle theme', subtitle: '라이트/다크 테마 전환', run: () => executeDesktopCommand('toggle-theme') },
      { id: 'refresh-content', title: 'Refresh content', subtitle: 'watcher/query cache 새로고침', run: () => executeDesktopCommand('reload-content') },
    ];

    const recentActions = (recentRootsQuery.data ?? []).map((root, index) => ({
      id: `recent-${index}`,
      title: `Open recent: ${root.split('/').at(-1) || root}`,
      subtitle: root,
      run: () => executeDesktopCommand('open-recent-content-root', { contentRoot: root }),
    }));

    return [...baseActions, ...recentActions];
  }, [recentRootsQuery.data]);

  const filteredActions = actions.filter((action) => {
    const haystack = `${action.title} ${action.subtitle ?? ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  if (!open) {
    return null;
  }

  return (
    <div className="command-palette-overlay" role="presentation" onClick={() => setOpen(false)}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="명령 검색"
          className="search-input command-palette-input"
        />
        <ul className="command-palette-list">
          {filteredActions.length > 0 ? (
            filteredActions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  className="command-palette-item"
                  onClick={() => {
                    void action.run();
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <strong>{action.title}</strong>
                  {action.subtitle ? <span className="muted mono">{action.subtitle}</span> : null}
                </button>
              </li>
            ))
          ) : (
            <li className="muted command-palette-empty">일치하는 명령이 없습니다.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
