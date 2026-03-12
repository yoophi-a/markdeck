import './globals.css';
import Link from 'next/link';
import type { Route } from 'next';

import { ThemeToggle } from '@/components/ThemeToggle';

const appTitle = process.env.MARKDECK_APP_TITLE ?? 'MarkDeck';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-theme="dark">
      <body>
        <div className="shell">
          <header className="topbar">
            <div>
              <Link href={'/' as Route} className="brand">
                {appTitle}
              </Link>
              <p className="subtitle">openclaw-workspace markdown browser</p>
            </div>
            <nav className="nav">
              <Link href={'/browse' as Route}>Browse</Link>
              <ThemeToggle />
            </nav>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
