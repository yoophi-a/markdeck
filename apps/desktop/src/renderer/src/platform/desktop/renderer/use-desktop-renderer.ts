'use client';

import { useEffect, useState } from 'react';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';

export function useDesktopRenderer() {
  const [desktopRenderer, setDesktopRenderer] = useState(false);

  useEffect(() => {
    setDesktopRenderer(isDesktopRenderer());
  }, []);

  return desktopRenderer;
}
