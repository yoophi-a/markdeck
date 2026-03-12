'use client';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { DesktopErrorBoundary } from '@/platform/desktop/renderer/desktop-error-boundary';
import { DesktopRendererRouter } from '@/platform/desktop/renderer/desktop-router';

export function DesktopRendererEntry() {
  if (!isDesktopRenderer()) {
    return null;
  }

  return (
    <DesktopErrorBoundary>
      <DesktopRendererRouter />
    </DesktopErrorBoundary>
  );
}
