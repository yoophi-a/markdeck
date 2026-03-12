'use client';

import { useEffect, useState } from 'react';

import type { BrowserEntry } from '@/shared/lib/content-types';
import { listDesktopDirectory } from '@/platform/desktop/renderer/desktop-api';
import { prettyPath } from '@/shared/lib/format';
import { BrowserList } from '@/widgets/content/browser-list';
import { Breadcrumbs } from '@/widgets/navigation/breadcrumbs';

interface DesktopBrowserContentProps {
  segments: string[];
  initialEntries: BrowserEntry[];
}

export function DesktopBrowserContent({ segments, initialEntries }: DesktopBrowserContentProps) {
  const [entries, setEntries] = useState(initialEntries);

  useEffect(() => {
    void listDesktopDirectory(segments.join('/'))
      .then((nextEntries) => setEntries(nextEntries))
      .catch(() => undefined);
  }, [segments]);

  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Browse</p>
        <h1>{prettyPath(segments.join('/'))}</h1>
        <Breadcrumbs segments={segments} />
      </div>

      <div className="card">{entries.length > 0 ? <BrowserList entries={entries} /> : <p className="muted">표시할 파일이 없다.</p>}</div>
    </section>
  );
}
