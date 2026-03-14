import { notFound } from 'next/navigation';

import { buildDocumentTree, collectMarkdownRelativePaths, readMarkdownDocument } from '@/platform/web/server/content-fs';
import { joinSegments } from '@/shared/lib/format';
import { DesktopDocumentPage } from '@/views/desktop/document/ui/desktop-document-page';

export default async function DocumentPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  const slug = joinSegments(resolvedParams);

  try {
    const document = await readMarkdownDocument(slug);
    const directorySegments = slug.slice(0, -1);
    const [knownDocuments, sidebarTree] = await Promise.all([
      collectMarkdownRelativePaths(),
      buildDocumentTree(directorySegments, 1),
    ]);

    return (
      <DesktopDocumentPage
        slug={slug}
        initialDocument={document}
        initialKnownDocuments={knownDocuments}
        initialSidebarTree={sidebarTree}
      />
    );
  } catch {
    notFound();
  }
}
