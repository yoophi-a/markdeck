'use client';

import { useDesktopDirectoryQuery } from '@/platform/desktop/renderer/desktop-queries';
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
  const relativePath = segments.join('/');
  const entriesQuery = useDesktopDirectoryQuery(relativePath, desktopRenderer);
  const entries = desktopRenderer ? entriesQuery.data : initialEntries;

  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Browse</p>
        <h1>{prettyPath(relativePath)}</h1>
        <Breadcrumbs segments={segments} />
      </div>

      <div className="card">
        {desktopRenderer && entriesQuery.isLoading ? (
          <p className="muted">불러오는 중…</p>
        ) : entries && entries.length > 0 ? (
          <BrowserList entries={entries} />
        ) : (
          <p className="muted">표시할 파일이 없다.</p>
        )}
      </div>
    </section>
  );
}
