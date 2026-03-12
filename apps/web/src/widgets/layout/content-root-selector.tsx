'use client';

import { FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/shared/ui/button';

export function ContentRootSelector() {
  const [contentRoot, setContentRoot] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (!window.markdeckDesktop) {
      return;
    }

    setIsDesktop(true);
    void window.markdeckDesktop.getContentRoot().then((nextRoot) => setContentRoot(nextRoot));
  }, []);

  if (!isDesktop) {
    return null;
  }

  async function handleChooseRoot() {
    const nextRoot = await window.markdeckDesktop?.chooseContentRoot();
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
