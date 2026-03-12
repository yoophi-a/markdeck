'use client';

import { useQueryClient } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { chooseDesktopContentRootAndReload, desktopQueryKeys, useDesktopContentRootQuery } from '@/platform/desktop/renderer/desktop-queries';
import { Button } from '@/shared/ui/button';

export function ContentRootSelector() {
  const queryClient = useQueryClient();
  const [isDesktop, setIsDesktop] = useState(false);
  const contentRootQuery = useDesktopContentRootQuery(isDesktop);

  useEffect(() => {
    if (isDesktopRenderer()) {
      setIsDesktop(true);
    }
  }, []);

  if (!isDesktop) {
    return null;
  }

  async function handleChooseRoot() {
    const nextRoot = await chooseDesktopContentRootAndReload();
    if (nextRoot) {
      queryClient.setQueryData(desktopQueryKeys.contentRoot, nextRoot);
    }
  }

  return (
    <div className="desktop-root-selector">
      <span className="muted mono desktop-root-label">{contentRootQuery.data ?? '폴더를 선택해 주세요'}</span>
      <Button type="button" variant="outline" size="sm" onClick={handleChooseRoot}>
        <FolderOpen className="size-4" />
        Content root 선택
      </Button>
    </div>
  );
}
