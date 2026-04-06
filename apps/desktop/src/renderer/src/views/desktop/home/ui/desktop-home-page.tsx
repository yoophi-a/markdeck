'use client';

import { useDesktopContentRootQuery, useDesktopRecentContentRootsQuery, useOpenDesktopRecentContentRootMutation } from '@/platform/desktop/renderer/desktop-queries';
import { DesktopContentRootEmptyState } from '@/platform/desktop/renderer/desktop-error-fallback';
import { toSettingsHref } from '@/shared/lib/routes';
import { cn } from '@/shared/lib/utils';
import { AppLink } from '@/shared/ui/app-link';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { PinnedDocuments } from '@/widgets/document/pinned-documents';

export function DesktopHomePage() {
  const contentRootQuery = useDesktopContentRootQuery(true);
  const recentRootsQuery = useDesktopRecentContentRootsQuery(true);
  const openRecentMutation = useOpenDesktopRecentContentRootMutation();
  const contentRoot = contentRootQuery.data ?? null;
  const recentRoots = (recentRootsQuery.data ?? []).filter((item) => item !== contentRoot);

  if (!contentRootQuery.isLoading && !contentRoot) {
    return <DesktopContentRootEmptyState />;
  }

  return (
    <section className="stack">
      <PinnedDocuments />

      <Card>
        <CardHeader>
          <CardTitle>최근 연 폴더</CardTitle>
          <CardDescription>최근 사용한 content root를 다시 열 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRoots.length > 0 ? (
            <ul className="workspace-root-list">
              {recentRoots.map((root) => (
                <li key={root} className="workspace-root-item">
                  <Button
                    type="button"
                    variant="outline"
                    className="workspace-root-button h-auto justify-between px-3 py-3"
                    onClick={() => openRecentMutation.mutate(root)}
                    disabled={openRecentMutation.isPending}
                  >
                    <span className="mono workspace-root-path">{root}</span>
                    <span className="muted">다시 열기</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">아직 최근 폴더가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>바로 이동</CardTitle>
          <CardDescription>문서 탐색, 검색, 설정은 전용 페이지에서 다룹니다.</CardDescription>
        </CardHeader>
        <CardContent className="actions">
          <AppLink href="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Browse
          </AppLink>
          <AppLink href="/search" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Search
          </AppLink>
          <AppLink href={toSettingsHref()} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Settings
          </AppLink>
        </CardContent>
      </Card>
    </section>
  );
}
