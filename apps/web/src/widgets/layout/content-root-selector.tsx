'use client';

import { FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { useChooseDesktopContentRootMutation, useDesktopContentRootQuery } from '@/platform/desktop/renderer/desktop-queries';
import { Button } from '@/shared/ui/button';

export function ContentRootSelector() {
  const [isDesktop, setIsDesktop] = useState(false);
  const contentRootQuery = useDesktopContentRootQuery(isDesktop);
  const chooseRootMutation = useChooseDesktopContentRootMutation();

  useEffect(() => {
    if (isDesktopRenderer()) {
      setIsDesktop(true);
    }
  }, []);

  if (!isDesktop) {
    return null;
  }

  async function handleChooseRoot() {
    await chooseRootMutation.mutateAsync();
  }

  return (
    <div className="desktop-root-selector">
      <span className="muted mono desktop-root-label">{contentRootQuery.data ?? '폴더를 선택해 주세요'}</span>
      <Button type="button" variant="outline" size="sm" onClick={handleChooseRoot} disabled={chooseRootMutation.isPending}>
        <FolderOpen className="size-4" />
        Content root 선택
      </Button>
    </div>
  );
}
