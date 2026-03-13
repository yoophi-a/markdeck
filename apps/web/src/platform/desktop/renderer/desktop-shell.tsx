'use client';

import { HashRouter } from 'react-router-dom';

import { DesktopCommandPalette } from '@/platform/desktop/renderer/desktop-command-palette';
import { DesktopErrorBoundary } from '@/platform/desktop/renderer/desktop-error-boundary';
import { DesktopEventBridge } from '@/platform/desktop/renderer/desktop-event-bridge';
import { DesktopRendererRouterBody } from '@/platform/desktop/renderer/desktop-router';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';

export function DesktopShell() {
  const desktopRenderer = useDesktopRenderer();

  if (!desktopRenderer) {
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
