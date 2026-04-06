'use client';

import { LayoutPanelLeft, ListTree, Maximize2, Minimize2, MessageSquareText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { readReaderLayoutState, writeReaderLayoutState } from '@/shared/lib/view-state';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

interface ReaderLayoutSettings {
  showTree: boolean;
  showFeedback: boolean;
  showToc: boolean;
  isDocumentMaximized: boolean;
  treeWidth: number;
  rightPanelWidth: number;
}

interface DocumentReaderLayoutProps {
  contentRootKey: string;
  tree: React.ReactNode;
  document: React.ReactNode;
  maximizedDocument: React.ReactNode;
  feedback: React.ReactNode;
  toc: React.ReactNode;
}

const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 420;
const DEFAULT_SETTINGS: ReaderLayoutSettings = {
  showTree: true,
  showFeedback: true,
  showToc: true,
  isDocumentMaximized: false,
  treeWidth: 280,
  rightPanelWidth: 280,
};

export function DocumentReaderLayout({ contentRootKey, tree, document, maximizedDocument, feedback, toc }: DocumentReaderLayoutProps) {
  const [settings, setSettings] = useState<ReaderLayoutSettings>(() => readLayoutSettings(contentRootKey));

  useEffect(() => {
    setSettings(readLayoutSettings(contentRootKey));
  }, [contentRootKey]);

  useEffect(() => {
    writeLayoutSettings(contentRootKey, settings);
  }, [contentRootKey, settings]);

  useEffect(() => {
    function handleDocumentShortcut(event: Event) {
      if (!(event instanceof KeyboardEvent) && event.type === 'markdeck:toggle-document-tree') {
        setSettings((current) => ({ ...current, showTree: !current.showTree }));
        return;
      }

      if (!(event instanceof KeyboardEvent) && event.type === 'markdeck:toggle-document-feedback') {
        setSettings((current) => ({ ...current, showFeedback: !current.showFeedback }));
        return;
      }

      if (!(event instanceof KeyboardEvent) && event.type === 'markdeck:toggle-document-toc') {
        setSettings((current) => ({ ...current, showToc: !current.showToc }));
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
    window.addEventListener('markdeck:toggle-document-feedback', handleDocumentShortcut as EventListener);
    window.addEventListener('markdeck:toggle-document-toc', handleDocumentShortcut as EventListener);
    window.addEventListener('markdeck:toggle-document-maximize', handleDocumentShortcut as EventListener);

    return () => {
      window.removeEventListener('keydown', handleDocumentShortcut);
      window.removeEventListener('markdeck:toggle-document-tree', handleDocumentShortcut as EventListener);
      window.removeEventListener('markdeck:toggle-document-feedback', handleDocumentShortcut as EventListener);
      window.removeEventListener('markdeck:toggle-document-toc', handleDocumentShortcut as EventListener);
      window.removeEventListener('markdeck:toggle-document-maximize', handleDocumentShortcut as EventListener);
    };
  }, []);

  const hasRightPanel = settings.showFeedback || settings.showToc;

  const layoutClassName = useMemo(() => {
    const classNames = ['document-layout'];

    if (settings.showTree && hasRightPanel) {
      classNames.push('with-tree');
    }

    if (settings.showTree) {
      classNames.push('has-tree');
    }

    if (hasRightPanel) {
      classNames.push('has-toc');
    }

    if (settings.isDocumentMaximized) {
      classNames.push('is-maximized');
    }

    return classNames.join(' ');
  }, [hasRightPanel, settings.isDocumentMaximized, settings.showTree]);

  const layoutStyle = useMemo(
    () =>
      ({
        '--document-tree-width': `${settings.treeWidth}px`,
        '--document-toc-width': `${settings.rightPanelWidth}px`,
      }) as React.CSSProperties,
    [settings.rightPanelWidth, settings.treeWidth]
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
            <Button type="button" variant={settings.showTree ? 'default' : 'outline'} size="sm" aria-pressed={settings.showTree} onClick={() => setSettings((current) => ({ ...current, showTree: !current.showTree }))}>
              <LayoutPanelLeft className="size-4" />
              트리
            </Button>
            <Button type="button" variant={settings.showFeedback ? 'default' : 'outline'} size="sm" aria-pressed={settings.showFeedback} onClick={() => setSettings((current) => ({ ...current, showFeedback: !current.showFeedback }))}>
              <MessageSquareText className="size-4" />
              피드백
            </Button>
            <Button type="button" variant={settings.showToc ? 'default' : 'outline'} size="sm" aria-pressed={settings.showToc} onClick={() => setSettings((current) => ({ ...current, showToc: !current.showToc }))}>
              <ListTree className="size-4" />
              목차
            </Button>
          </div>
        </div>
      ) : null}

      <div className={layoutClassName} style={layoutStyle}>
        {settings.isDocumentMaximized ? (
          <div className={cn('document-maximized-shell', 'stack')}>
            <Button type="button" variant="secondary" size="sm" className="document-maximized-restore" onClick={() => setSettings((current) => ({ ...current, isDocumentMaximized: false }))} title="Esc 로도 돌아갈 수 있습니다">
              <Minimize2 className="size-4" />
              일반 보기
            </Button>
            {maximizedDocument}
          </div>
        ) : (
          <>
            {settings.showTree ? <div className="document-tree-side stack">{tree}</div> : null}
            {settings.showTree ? <ResizeHandle ariaLabel="좌측 패널 너비 조절" title="트리 너비 조절" onResize={(deltaX) => setSettings((current) => ({ ...current, treeWidth: clampPanelWidth(current.treeWidth + deltaX) }))} /> : null}
            <div className="document-main stack">{document}</div>
            {hasRightPanel ? <ResizeHandle ariaLabel="우측 패널 너비 조절" title="우측 패널 너비 조절" onResize={(deltaX) => setSettings((current) => ({ ...current, rightPanelWidth: clampPanelWidth(current.rightPanelWidth - deltaX) }))} /> : null}
            {hasRightPanel ? <div className="document-side stack">{settings.showFeedback ? feedback : null}{settings.showToc ? toc : null}</div> : null}
          </>
        )}
      </div>
    </>
  );
}

function ResizeHandle({ onResize, ariaLabel, title }: { onResize: (deltaX: number) => void; ariaLabel: string; title: string }) {
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
      <span className="document-resize-marker" aria-hidden="true">
        <span className="document-resize-grip" />
      </span>
    </button>
  );
}

function clampPanelWidth(width: number) {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(width)));
}

function readLayoutSettings(contentRootKey: string): ReaderLayoutSettings {
  const parsed = readReaderLayoutState(contentRootKey) as (Partial<ReaderLayoutSettings> & { tocWidth?: number; feedbackWidth?: number }) | null;
  if (!parsed) {
    return DEFAULT_SETTINGS;
  }

  return {
    showTree: parsed.showTree ?? true,
    showFeedback: parsed.showFeedback ?? true,
    showToc: parsed.showToc ?? true,
    isDocumentMaximized: parsed.isDocumentMaximized ?? false,
    treeWidth: clampPanelWidth(parsed.treeWidth ?? DEFAULT_SETTINGS.treeWidth),
    rightPanelWidth: clampPanelWidth(parsed.rightPanelWidth ?? parsed.feedbackWidth ?? parsed.tocWidth ?? DEFAULT_SETTINGS.rightPanelWidth),
  };
}

function writeLayoutSettings(contentRootKey: string, settings: ReaderLayoutSettings) {
  writeReaderLayoutState({
    contentRootKey,
    ...settings,
  });
}
