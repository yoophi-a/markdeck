'use client';

import { useEffect, useState } from 'react';

import { listDesktopDirectory } from '@/platform/desktop/renderer/desktop-api';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import type { BrowserEntry } from '@/shared/lib/content-types';
import { prettyPath } from '@/shared/lib/format';
import { BrowserList } from '@/widgets/content/browser-list';
import { Breadcrumbs } from '@/widgets/navigation/breadcrumbs';

interface DesktopBrowserContentProps {
  segments: string[];
  initialEntries: BrowserEntry[];
}

export function DesktopBrowserContent({ segments, initialEntries }: DesktopBrowserContentProps) {
  const desktopRenderer = useDesktopRenderer();
  const [entries, setEntries] = useState<BrowserEntry[] | null>(desktopRenderer ? null : initialEntries);

  useEffect(() => {
    if (!desktopRenderer) {
      setEntries(initialEntries);
      return;
    }

    setEntries(null);

    void listDesktopDirectory(segments.join('/'))
      .then((nextEntries) => setEntries(nextEntries))
      .catch(() => setEntries([]));
  }, [desktopRenderer, initialEntries, segments]);

  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Browse</p>
        <h1>{prettyPath(segments.join('/'))}</h1>
        <Breadcrumbs segments={segments} />
      </div>

      <div className="card">
        {entries === null ? (
          <p className="muted">불러오는 중…</p>
        ) : entries.length > 0 ? (
          <BrowserList entries={entries} />
        ) : (
          <p className="muted">표시할 파일이 없다.</p>
        )}
      </div>
    </section>
  );
}
