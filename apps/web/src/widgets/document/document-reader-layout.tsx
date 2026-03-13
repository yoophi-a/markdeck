'use client';

import { LayoutPanelLeft, ListTree, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

interface ReaderLayoutSettings {
  showTree: boolean;
  showToc: boolean;
  isDocumentMaximized: boolean;
}

interface DocumentReaderLayoutProps {
  tree: React.ReactNode;
  document: React.ReactNode;
  maximizedDocument: React.ReactNode;
  toc: React.ReactNode;
}

const STORAGE_KEY = 'markdeck:reader-layout';
const DEFAULT_SETTINGS: ReaderLayoutSettings = {
  showTree: true,
  showToc: true,
  isDocumentMaximized: false,
};

export function DocumentReaderLayout({ tree, document, maximizedDocument, toc }: DocumentReaderLayoutProps) {
  const [settings, setSettings] = useState<ReaderLayoutSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readLayoutSettings());
  }, []);

  useEffect(() => {
    writeLayoutSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!settings.isDocumentMaximized) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      setSettings((current) => ({ ...current, isDocumentMaximized: false }));
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings.isDocumentMaximized]);

  const layoutClassName = useMemo(() => {
    const classNames = ['document-layout'];

    if (settings.showTree && settings.showToc) {
      classNames.push('with-tree');
    }

    if (settings.isDocumentMaximized) {
      classNames.push('is-maximized');
    }

    return classNames.join(' ');
  }, [settings.isDocumentMaximized, settings.showToc, settings.showTree]);

  return (
    <>
      {!settings.isDocumentMaximized ? (
        <div className="card document-layout-toolbar">
          <div className="document-layout-toolbar-title">
            <p className="eyebrow">Reader</p>
            <h2>읽기 레이아웃</h2>
          </div>
          <div className="document-layout-toolbar-actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSettings((current) => ({ ...current, isDocumentMaximized: true }))}
              title="문서 미리보기만 크게 보기"
            >
              <Maximize2 className="size-4" />
              미리보기만 보기
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSettings((current) => ({ ...current, showTree: !current.showTree }))}>
              <LayoutPanelLeft className="size-4" />
              {settings.showTree ? '트리 숨기기' : '트리 보기'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSettings((current) => ({ ...current, showToc: !current.showToc }))}>
              <ListTree className="size-4" />
              {settings.showToc ? '목차 숨기기' : '목차 보기'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className={layoutClassName}>
        {settings.isDocumentMaximized ? (
          <div className={cn('document-maximized-shell', 'stack')}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="document-maximized-restore"
              onClick={() => setSettings((current) => ({ ...current, isDocumentMaximized: false }))}
              title="Esc 로도 돌아갈 수 있습니다"
            >
              <Minimize2 className="size-4" />
              일반 보기
            </Button>
            {maximizedDocument}
          </div>
        ) : (
          <>
            {settings.showTree ? <div className="document-tree-side stack">{tree}</div> : null}
            <div className="document-main stack">{document}</div>
            {settings.showToc ? <div className="document-side stack">{toc}</div> : null}
          </>
        )}
      </div>
    </>
  );
}

function readLayoutSettings(): ReaderLayoutSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(rawValue) as Partial<ReaderLayoutSettings>;
    return {
      showTree: parsed.showTree ?? true,
      showToc: parsed.showToc ?? true,
      isDocumentMaximized: parsed.isDocumentMaximized ?? false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeLayoutSettings(settings: ReaderLayoutSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
