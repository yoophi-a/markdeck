import { notFound } from 'next/navigation';

import { listDirectory } from '@/platform/web/server/content-fs';
import { joinSegments } from '@/shared/lib/format';
import { DesktopBrowserContent } from '@/views/desktop/browse/ui/desktop-browser-page';

export default async function BrowsePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const slug = joinSegments(resolvedParams);

  try {
    const entries = await listDirectory(slug);
    return <DesktopBrowserContent segments={slug} initialEntries={entries} />;
  } catch {
    notFound();
  }
}
