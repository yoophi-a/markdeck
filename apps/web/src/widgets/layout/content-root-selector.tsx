'use client';

import { FolderOpen, History } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { useChooseDesktopContentRootMutation, useDesktopContentRootQuery, useDesktopRecentContentRootsQuery, useOpenDesktopRecentContentRootMutation } from '@/platform/desktop/renderer/desktop-queries';
import { Button } from '@/shared/ui/button';

export function ContentRootSelector() {
  const [isDesktop, setIsDesktop] = useState(false);
  const contentRootQuery = useDesktopContentRootQuery(isDesktop);
  const recentRootsQuery = useDesktopRecentContentRootsQuery(isDesktop);
  const chooseRootMutation = useChooseDesktopContentRootMutation();
  const openRecentMutation = useOpenDesktopRecentContentRootMutation();

  useEffect(() => {
    if (isDesktopRenderer()) {
      setIsDesktop(true);
    }
  }, []);

  const currentRoot = contentRootQuery.data ?? null;
  const recentRoots = useMemo(() => (recentRootsQuery.data ?? []).filter((root) => root !== currentRoot).slice(0, 2), [currentRoot, recentRootsQuery.data]);

  if (!isDesktop) {
    return null;
  }

  async function handleChooseRoot() {
    await chooseRootMutation.mutateAsync();
  }

  return (
    <div className="desktop-root-selector desktop-root-selector-stack">
      <div className="desktop-root-selector-row">
        <span className="muted mono desktop-root-label">{currentRoot ?? '폴더를 선택해 주세요'}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleChooseRoot} disabled={chooseRootMutation.isPending}>
          <FolderOpen className="size-4" />
          Content root 선택
        </Button>
      </div>
      {recentRoots.length > 0 ? (
        <div className="desktop-root-selector-row desktop-root-selector-recent">
          <span className="muted desktop-root-recent-label">
            <History className="size-3.5" />
            Recent
          </span>
          <div className="desktop-root-recent-actions">
            {recentRoots.map((root) => (
              <button key={root} type="button" className="desktop-root-recent-button" onClick={() => openRecentMutation.mutate(root)} disabled={openRecentMutation.isPending}>
                <span className="mono">{root.split('/').at(-1) || root}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
