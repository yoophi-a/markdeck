'use client';

import { FolderOpen } from 'lucide-react';
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

  function handleSelectRoot(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextRoot = event.target.value;
    if (!nextRoot || nextRoot === currentRoot) {
      return;
    }

    openRecentMutation.mutate(nextRoot);
  }

  return (
    <div className="desktop-root-selector">
      <div className="desktop-root-selector-row desktop-root-selector-main">
        <select
          className="desktop-root-select mono"
          value={currentRoot ?? ''}
          onChange={handleSelectRoot}
          disabled={openRecentMutation.isPending || chooseRootMutation.isPending}
          aria-label="Content root"
        >
          <option value="" disabled>
            폴더를 선택해 주세요
          </option>
          {currentRoot ? <option value={currentRoot}>{currentRoot}</option> : null}
          {recentRoots.map((root) => (
            <option key={root} value={root}>
              {root}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleChooseRoot} disabled={chooseRootMutation.isPending}>
        <FolderOpen className="size-4" />
        Content root 선택
      </Button>
    </div>
  );
}
