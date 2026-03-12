import './globals.css';

import { Geist } from 'next/font/google';

import { cn } from '@/shared/lib/utils';
import { AppHeader } from '@/widgets/layout/app-header';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-theme="dark" className={cn('font-sans', geist.variable)}>
      <body>
        <div className="shell">
          <AppHeader />
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
