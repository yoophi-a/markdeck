'use client';

import { DesktopRendererRouter } from '@/platform/desktop/renderer/desktop-router';
import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';

export function DesktopRendererEntry() {
  if (!isDesktopRenderer()) {
    return null;
  }

  return <DesktopRendererRouter />;
}
