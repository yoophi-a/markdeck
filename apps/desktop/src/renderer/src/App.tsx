import { useEffect, useState } from 'react';

import { DesktopQueryProvider } from '@/platform/desktop/renderer/desktop-query-provider';
import { DesktopShell } from '@/platform/desktop/renderer/desktop-shell';
import { AppHeader } from '@/widgets/layout/app-header';
import { ContentRootSelector } from '@/widgets/layout/content-root-selector';
import { HashRouter } from 'react-router-dom';

const DESKTOP_CHROME_COLLAPSED_KEY = 'markdeck:desktop-chrome-collapsed';

export function App() {
  const [isChromeCollapsed, setIsChromeCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsChromeCollapsed(window.localStorage.getItem(DESKTOP_CHROME_COLLAPSED_KEY) === 'true');

    const handleToggle = () => {
      setIsChromeCollapsed((current) => {
        const next = !current;
        window.localStorage.setItem(DESKTOP_CHROME_COLLAPSED_KEY, String(next));
        return next;
      });
    };

    window.addEventListener('markdeck:toggle-desktop-chrome', handleToggle as EventListener);
    return () => window.removeEventListener('markdeck:toggle-desktop-chrome', handleToggle as EventListener);
  }, []);

  return (
    <DesktopQueryProvider>
      <HashRouter>
        <div className="shell">
          {isChromeCollapsed ? null : (
            <div className="desktop-chrome">
              <AppHeader />
              <section className="workspace-strip">
                <ContentRootSelector />
              </section>
            </div>
          )}
          <main className="content">
            <DesktopShell />
          </main>
        </div>
      </HashRouter>
    </DesktopQueryProvider>
  );
}
