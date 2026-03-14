'use client';

import { Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

const shortcutGroups = [
  {
    title: 'Global',
    items: [
      ['⌘/Ctrl + ⇧ + P', 'command palette'],
      ['⌘/Ctrl + K', '검색 포커스'],
      ['⌥ + ← / →', '뒤로 / 앞으로'],
      ['⌘/Ctrl + /', 'shortcut 도움말'],
      ['⌘/Ctrl + R', 'content 새로고침'],
    ],
  },
  {
    title: 'Document',
    items: [
      ['t', '트리 토글'],
      ['o', '목차 토글'],
      ['m', '미리보기만 보기 / 일반 보기'],
      ['Esc', 'overlay 닫기 / 일반 보기로 복귀'],
    ],
  },
];

export function DesktopShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const toggle = () => setOpen((current) => !current);
    const close = () => setOpen(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        toggle();
        return;
      }

      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const tagName = target?.tagName?.toLowerCase();
        const isTypingTarget = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;
        if (isTypingTarget) {
          return;
        }

        event.preventDefault();
        toggle();
        return;
      }

      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('markdeck:toggle-shortcut-help', toggle as EventListener);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('markdeck:toggle-shortcut-help', toggle as EventListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="command-palette-overlay" role="presentation" onClick={() => setOpen(false)}>
      <Card className="shortcut-help-dialog" role="dialog" aria-modal="true" aria-label="Shortcut help" onClick={(event) => event.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="size-4" />
            Keyboard shortcuts
          </CardTitle>
          <CardDescription>desktop에서 자주 쓰는 단축키 모음입니다.</CardDescription>
        </CardHeader>
        <CardContent className="stack">
          <div className="grid two-up shortcut-help-grid">
            {shortcutGroups.map((group) => (
              <section key={group.title} className="card stack">
                <div>
                  <p className="eyebrow">Shortcut</p>
                  <h2>{group.title}</h2>
                </div>
                <ul className="shortcut-list muted mono">
                  {group.items.map(([keys, label]) => (
                    <li key={keys} className="shortcut-help-item">
                      <strong>{keys}</strong>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="actions justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
