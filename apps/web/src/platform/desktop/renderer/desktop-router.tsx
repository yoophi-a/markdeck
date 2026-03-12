'use client';

import { useEffect, useMemo, useState } from 'react';
import { HashRouter, useLocation } from 'react-router-dom';

import { getDesktopContentRoot, isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { parseAppRoute } from '@/shared/lib/app-routes';
import { DesktopBrowserContent } from '@/widgets/content/desktop-browser-content';
import { DesktopDocumentPage } from '@/widgets/document/desktop-document-page';
import { PinnedDocuments } from '@/widgets/document/pinned-documents';
import { RecentDocuments } from '@/widgets/document/recent-documents';
import { DesktopSearchPage } from '@/widgets/search/desktop-search-page';

export function DesktopRendererRouter() {
  if (!isDesktopRenderer()) {
    return null;
  }

  return (
    <>
      <style>{'.web-home-page { display: none; }'}</style>
      <HashRouter>
        <DesktopRendererRouterBody />
      </HashRouter>
    </>
  );
}

function DesktopRendererRouterBody() {
  const location = useLocation();
  const route = useMemo(() => parseAppRoute(location.pathname, location.search), [location.pathname, location.search]);

  switch (route.kind) {
    case 'home':
      return <DesktopHomePage />;
    case 'browse':
      return <DesktopBrowserContent segments={route.segments} initialEntries={[]} />;
    case 'document':
      return <DesktopDocumentPage slug={route.segments} initialKnownDocuments={[]} initialSidebarTree={[]} />;
    case 'search':
      return <DesktopSearchPage initialQuery={route.query} initialResults={[]} />;
    default:
      return <DesktopNotFoundPage />;
  }
}

function DesktopHomePage() {
  const [contentRoot, setContentRoot] = useState<string | null>(null);

  useEffect(() => {
    void getDesktopContentRoot().then((nextRoot) => setContentRoot(nextRoot));
  }, []);

  return (
    <section className="stack">
      <div className="hero-card">
        <p className="eyebrow">Desktop</p>
        <h1>MarkDeck</h1>
        <p>desktop renderer는 HashRouter 기반 route state를 사용하고, 문서 데이터는 Electron IPC를 통해 읽습니다.</p>
      </div>

      <div className="grid two-up">
        <article className="card">
          <h2>핵심 기능</h2>
          <ul>
            <li>desktop 전용 hash route entry</li>
            <li>browse / docs / search client-side route 전환</li>
            <li>Electron main IPC 기반 문서 데이터 조회</li>
            <li>embedded web server는 bootstrap 용도로만 유지</li>
          </ul>
        </article>

        <article className="card">
          <h2>현재 설정</h2>
          <p>
            <strong>content root</strong>
          </p>
          <code>{contentRoot ?? '불러오는 중…'}</code>
          <p className="muted">ignore patterns: .git, node_modules</p>
        </article>
      </div>

      <PinnedDocuments />
      <RecentDocuments />
    </section>
  );
}

function DesktopNotFoundPage() {
  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Desktop</p>
        <h1>경로를 찾지 못했습니다.</h1>
        <p className="muted">알 수 없는 desktop route입니다.</p>
      </div>
    </section>
  );
}
