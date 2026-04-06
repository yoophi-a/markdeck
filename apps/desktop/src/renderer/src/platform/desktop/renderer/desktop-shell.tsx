import { DesktopCommandPalette } from '@/widgets/desktop/command-palette/ui/desktop-command-palette';
import { DesktopErrorBoundary } from '@/platform/desktop/renderer/desktop-error-boundary';
import { DesktopEventBridge } from '@/platform/desktop/renderer/desktop-event-bridge';
import { DesktopRendererRouterBody } from '@/platform/desktop/renderer/desktop-router';
import { DesktopShortcutHelp } from '@/widgets/desktop/shortcut-help/ui/desktop-shortcut-help';

export function DesktopShell() {
  return (
    <DesktopErrorBoundary>
      <DesktopEventBridge />
      <DesktopCommandPalette />
      <DesktopShortcutHelp />
      <DesktopRendererRouterBody />
    </DesktopErrorBoundary>
  );
}
