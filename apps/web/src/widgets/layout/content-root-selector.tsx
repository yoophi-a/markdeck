'use client';

import { FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

import { chooseDesktopContentRoot, getDesktopContentRoot, isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { Button } from '@/shared/ui/button';

export function ContentRootSelector() {
  const [contentRoot, setContentRoot] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (!isDesktopRenderer()) {
      return;
    }

    setIsDesktop(true);
    void getDesktopContentRoot().then((nextRoot) => setContentRoot(nextRoot));
  }, []);

  if (!isDesktop) {
    return null;
  }

  async function handleChooseRoot() {
    const nextRoot = await chooseDesktopContentRoot();
    if (nextRoot) {
      setContentRoot(nextRoot);
    }
  }

  return (
    <div className="desktop-root-selector">
      <span className="muted mono desktop-root-label">{contentRoot ?? '폴더를 선택해 주세요'}</span>
      <Button type="button" variant="outline" size="sm" onClick={handleChooseRoot}>
        <FolderOpen className="size-4" />
        Content root 선택
      </Button>
    </div>
  );
}
