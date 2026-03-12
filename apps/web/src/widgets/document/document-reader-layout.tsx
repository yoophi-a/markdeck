'use client';

import { LayoutPanelLeft, ListTree, StretchHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/shared/ui/button';

interface ReaderLayoutSettings {
  width: 'comfortable' | 'compact';
  showTree: boolean;
  showToc: boolean;
}

interface DocumentReaderLayoutProps {
  tree: React.ReactNode;
  document: React.ReactNode;
  toc: React.ReactNode;
}

const STORAGE_KEY = 'markdeck:reader-layout';
const DEFAULT_SETTINGS: ReaderLayoutSettings = {
  width: 'comfortable',
  showTree: true,
  showToc: true,
};

export function DocumentReaderLayout({ tree, document, toc }: DocumentReaderLayoutProps) {
  const [settings, setSettings] = useState<ReaderLayoutSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readLayoutSettings());
  }, []);

  useEffect(() => {
    writeLayoutSettings(settings);
  }, [settings]);

  const layoutClassName = useMemo(() => {
    const classNames = ['document-layout'];

    if (settings.showTree && settings.showToc) {
      classNames.push('with-tree');
    }

    if (settings.width === 'compact') {
      classNames.push('compact');
    }

    return classNames.join(' ');
  }, [settings]);

  return (
    <>
      <div className="card document-layout-toolbar">
        <div className="document-layout-toolbar-title">
          <p className="eyebrow">Reader</p>
          <h2>읽기 레이아웃</h2>
        </div>
        <div className="document-layout-toolbar-actions">
          <Button type="button" variant="outline" size="sm" onClick={() => setSettings((current) => ({ ...current, width: current.width === 'comfortable' ? 'compact' : 'comfortable' }))}>
            <StretchHorizontal className="size-4" />
            {settings.width === 'comfortable' ? 'Compact width' : 'Comfortable width'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSettings((current) => ({ ...current, showTree: !current.showTree }))}>
            <LayoutPanelLeft className="size-4" />
            {settings.showTree ? 'Hide tree' : 'Show tree'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSettings((current) => ({ ...current, showToc: !current.showToc }))}>
            <ListTree className="size-4" />
            {settings.showToc ? 'Hide TOC' : 'Show TOC'}
          </Button>
        </div>
      </div>

      <div className={layoutClassName}>
        {settings.showTree ? <div className="document-tree-side stack">{tree}</div> : null}
        <div className="document-main stack">{document}</div>
        {settings.showToc ? <div className="document-side stack">{toc}</div> : null}
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
      width: parsed.width === 'compact' ? 'compact' : 'comfortable',
      showTree: parsed.showTree ?? true,
      showToc: parsed.showToc ?? true,
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
