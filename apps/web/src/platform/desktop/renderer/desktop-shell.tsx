'use client';

import { HashRouter } from 'react-router-dom';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { DesktopCommandPalette } from '@/platform/desktop/renderer/desktop-command-palette';
import { DesktopErrorBoundary } from '@/platform/desktop/renderer/desktop-error-boundary';
import { DesktopEventBridge } from '@/platform/desktop/renderer/desktop-event-bridge';
import { DesktopRendererRouterBody } from '@/platform/desktop/renderer/desktop-router';

export function DesktopShell() {
  if (!isDesktopRenderer()) {
    return null;
  }

  return (
    <DesktopErrorBoundary>
      <DesktopEventBridge />
      <DesktopCommandPalette />
      <style>{'.web-home-page { display: none; }'}</style>
      <HashRouter>
        <DesktopRendererRouterBody />
      </HashRouter>
    </DesktopErrorBoundary>
  );
}
