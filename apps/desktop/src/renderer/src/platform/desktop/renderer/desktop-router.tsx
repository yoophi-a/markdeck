'use client';

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { parseAppRoute } from '@/shared/lib/app-routes';
import { DesktopBrowserContent } from '@/views/desktop/browse/ui/desktop-browser-page';
import { DesktopDocumentPage } from '@/views/desktop/document/ui/desktop-document-page';
import { DesktopSearchPage } from '@/views/desktop/search/ui/desktop-search-page';
import { DesktopSettingsPage } from '@/views/desktop/settings/ui/desktop-settings-page';

export function DesktopRendererRouterBody() {
  const location = useLocation();
  const route = useMemo(() => parseAppRoute(location.pathname, location.search), [location.pathname, location.search]);

  switch (route.kind) {
    case 'browse':
      return <DesktopBrowserContent segments={route.segments} initialEntries={[]} />;
    case 'document':
      return <DesktopDocumentPage slug={route.segments} initialKnownDocuments={[]} initialSidebarTree={[]} />;
    case 'search':
      return <DesktopSearchPage initialQuery={route.query} initialResults={[]} />;
    case 'settings':
      return <DesktopSettingsPage />;
    default:
      return <DesktopNotFoundPage />;
  }
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
