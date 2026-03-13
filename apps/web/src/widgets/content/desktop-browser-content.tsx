'use client';

import { useEffect } from 'react';

import { DesktopContentRootEmptyState, DesktopErrorFallback } from '@/platform/desktop/renderer/desktop-error-fallback';
import { useDesktopContentRootQuery, useDesktopDirectoryQuery } from '@/platform/desktop/renderer/desktop-queries';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import type { BrowserEntry } from '@/shared/lib/content-types';
import { prettyPath } from '@/shared/lib/format';
import { writeLastBrowseState } from '@/shared/lib/view-state';
import { BrowserList } from '@/widgets/content/browser-list';
import { Breadcrumbs } from '@/widgets/navigation/breadcrumbs';

interface DesktopBrowserContentProps {
  segments: string[];
  initialEntries: BrowserEntry[];
}

export function DesktopBrowserContent({ segments, initialEntries }: DesktopBrowserContentProps) {
  const desktopRenderer = useDesktopRenderer();
  const relativePath = segments.join('/');
  const contentRootQuery = useDesktopContentRootQuery(desktopRenderer);
  const entriesQuery = useDesktopDirectoryQuery(relativePath, desktopRenderer);
  const entries = desktopRenderer ? entriesQuery.data : initialEntries;
  const contentRootKey = contentRootQuery.data ?? 'web';

  useEffect(() => {
    if (desktopRenderer && !contentRootQuery.data) {
      return;
    }

    writeLastBrowseState({
      contentRootKey,
      relativePath,
      viewedAt: new Date().toISOString(),
    });
  }, [contentRootKey, contentRootQuery.data, desktopRenderer, relativePath]);

  if (desktopRenderer && !contentRootQuery.isLoading && !contentRootQuery.data) {
    return <DesktopContentRootEmptyState />;
  }

  if (desktopRenderer && entriesQuery.isError) {
    return <DesktopErrorFallback title="폴더를 불러오지 못했습니다." error={entriesQuery.error} onRetry={() => void entriesQuery.refetch()} />;
  }

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
