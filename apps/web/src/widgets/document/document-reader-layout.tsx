'use client';

import { LayoutPanelLeft, ListTree, Maximize2, Minimize2, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

interface ReaderLayoutSettings {
  showTree: boolean;
  showFeedback: boolean;
  isDocumentMaximized: boolean;
  treeWidth: number;
  feedbackWidth: number;
}

interface DocumentReaderLayoutProps {
  tree: React.ReactNode;
  document: React.ReactNode;
  maximizedDocument: React.ReactNode;
  feedback: React.ReactNode;
}

const STORAGE_KEY = 'markdeck:reader-layout';
const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 420;
const DEFAULT_SETTINGS: ReaderLayoutSettings = {
  showTree: true,
  showFeedback: true,
  isDocumentMaximized: false,
  treeWidth: 280,
  feedbackWidth: 280,
};

export function DocumentReaderLayout({ tree, document, maximizedDocument, feedback }: DocumentReaderLayoutProps) {
  const [settings, setSettings] = useState<ReaderLayoutSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readLayoutSettings());
  }, []);

  useEffect(() => {
    writeLayoutSettings(settings);
  }, [settings]);

  useEffect(() => {
    function handleDocumentShortcut(event: Event) {
      if (!(event instanceof KeyboardEvent) && event.type === 'markdeck:toggle-document-tree') {
        setSettings((current) => ({ ...current, showTree: !current.showTree }));
        return;
      }

      if (!(event instanceof KeyboardEvent) && event.type === 'markdeck:toggle-document-toc') {
        setSettings((current) => ({ ...current, showFeedback: !current.showFeedback }));
        return;
      }

      if (!(event instanceof KeyboardEvent) && event.type === 'markdeck:toggle-document-maximize') {
        setSettings((current) => ({ ...current, isDocumentMaximized: !current.isDocumentMaximized }));
        return;
      }

      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setSettings((current) => ({ ...current, isDocumentMaximized: false }));
      }
    }

    window.addEventListener('keydown', handleDocumentShortcut);
    window.addEventListener('markdeck:toggle-document-tree', handleDocumentShortcut as EventListener);
    window.addEventListener('markdeck:toggle-document-toc', handleDocumentShortcut as EventListener);
    window.addEventListener('markdeck:toggle-document-maximize', handleDocumentShortcut as EventListener);

    return () => {
      window.removeEventListener('keydown', handleDocumentShortcut);
      window.removeEventListener('markdeck:toggle-document-tree', handleDocumentShortcut as EventListener);
      window.removeEventListener('markdeck:toggle-document-toc', handleDocumentShortcut as EventListener);
      window.removeEventListener('markdeck:toggle-document-maximize', handleDocumentShortcut as EventListener);
    };
  }, []);

  const layoutClassName = useMemo(() => {
    const classNames = ['document-layout'];

    if (settings.showTree && settings.showFeedback) {
      classNames.push('with-tree');
    }

    if (settings.showTree) {
      classNames.push('has-tree');
    }

    if (settings.showFeedback) {
      classNames.push('has-toc');
    }

    if (settings.isDocumentMaximized) {
      classNames.push('is-maximized');
    }

    return classNames.join(' ');
  }, [settings.isDocumentMaximized, settings.showFeedback, settings.showTree]);

  const layoutStyle = useMemo(
    () =>
      ({
        '--document-tree-width': `${settings.treeWidth}px`,
        '--document-toc-width': `${settings.feedbackWidth}px`,
      }) as React.CSSProperties,
    [settings.feedbackWidth, settings.treeWidth]
  );

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
            <Button
              type="button"
              variant={settings.showTree ? 'default' : 'outline'}
              size="sm"
              aria-pressed={settings.showTree}
              onClick={() => setSettings((current) => ({ ...current, showTree: !current.showTree }))}
            >
              <LayoutPanelLeft className="size-4" />
              트리
            </Button>
            <Button
              type="button"
              variant={settings.showFeedback ? 'default' : 'outline'}
              size="sm"
              aria-pressed={settings.showFeedback}
              onClick={() => setSettings((current) => ({ ...current, showFeedback: !current.showFeedback }))}
            >
              <ListTree className="size-4" />
              피드백
            </Button>
          </div>
        </div>
      ) : null}

      <div className={layoutClassName} style={layoutStyle}>
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
            {settings.showTree ? (
              <ResizeHandle
                ariaLabel="좌측 패널 너비 조절"
                title="트리 너비 조절"
                onResize={(deltaX) => {
                  setSettings((current) => ({
                    ...current,
                    treeWidth: clampPanelWidth(current.treeWidth + deltaX),
                  }));
                }}
              />
            ) : null}
            <div className="document-main stack">{document}</div>
            {settings.showFeedback ? (
              <ResizeHandle
                ariaLabel="우측 패널 너비 조절"
                title="피드백 너비 조절"
                onResize={(deltaX) => {
                  setSettings((current) => ({
                    ...current,
                    feedbackWidth: clampPanelWidth(current.feedbackWidth - deltaX),
                  }));
                }}
                icon="right"
              />
            ) : null}
            {settings.showFeedback ? <div className="document-side stack">{feedback}</div> : null}
          </>
        )}
      </div>
    </>
  );
}

function ResizeHandle({
  onResize,
  ariaLabel,
  title,
  icon = 'left',
}: {
  onResize: (deltaX: number) => void;
  ariaLabel: string;
  title: string;
  icon?: 'left' | 'right';
}) {
  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (window.innerWidth <= 1024) {
      return;
    }

    const pointerId = event.pointerId;
    let previousX = event.clientX;
    event.currentTarget.setPointerCapture(pointerId);
    document.body.classList.add('is-resizing-document-layout');

    function handlePointerMove(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - previousX;
      previousX = moveEvent.clientX;
      onResize(deltaX);
    }

    function stopDragging() {
      document.body.classList.remove('is-resizing-document-layout');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
  }

  return (
    <button type="button" className="document-resize-handle" onPointerDown={handlePointerDown} aria-label={ariaLabel} title={title}>
      <span className="document-resize-grip" aria-hidden="true" />
      {icon === 'left' ? <PanelLeftClose className="size-3.5 document-resize-icon" /> : <PanelRightClose className="size-3.5 document-resize-icon" />}
    </button>
  );
}

function clampPanelWidth(width: number) {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(width)));
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

    const parsed = JSON.parse(rawValue) as Partial<ReaderLayoutSettings> & { showToc?: boolean; tocWidth?: number };
    return {
      showTree: parsed.showTree ?? true,
      showFeedback: parsed.showFeedback ?? parsed.showToc ?? true,
      isDocumentMaximized: parsed.isDocumentMaximized ?? false,
      treeWidth: clampPanelWidth(parsed.treeWidth ?? DEFAULT_SETTINGS.treeWidth),
      feedbackWidth: clampPanelWidth(parsed.feedbackWidth ?? parsed.tocWidth ?? DEFAULT_SETTINGS.feedbackWidth),
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
