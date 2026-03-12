import { notFound } from 'next/navigation';

import { listDirectory } from '@/shared/lib/content';
import { joinSegments } from '@/shared/lib/format';
import { DesktopBrowserContent } from '@/widgets/content/desktop-browser-content';

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
