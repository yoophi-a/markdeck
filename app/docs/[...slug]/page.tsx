import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';

import { buildDocumentTree, collectMarkdownRelativePaths, readMarkdownDocument } from '@/shared/lib/content';
import { formatDateTime, formatFileSize, joinSegments } from '@/shared/lib/format';
import { extractHeadings, preprocessWikiLinks, resolveWikiLinkHref } from '@/shared/lib/markdown';
import { toBrowseHref } from '@/shared/lib/routes';
import { DocumentReaderLayout } from '@/widgets/document/document-reader-layout';
import { DocumentTree } from '@/widgets/document/document-tree';
import { MarkdownView } from '@/widgets/document/markdown-view';
import { PinnedDocuments } from '@/widgets/document/pinned-documents';
import { RecentDocuments } from '@/widgets/document/recent-documents';
import { TableOfContents } from '@/widgets/document/table-of-contents';
import { Breadcrumbs } from '@/widgets/navigation/breadcrumbs';

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
    const content = preprocessWikiLinks(document.content, (rawTarget) =>
      resolveWikiLinkHref(document.relativePath, rawTarget, knownDocuments)
    );
    const headings = extractHeadings(content);
    const stats = summarizeDocument(content, headings.length);
    const directoryPath = directorySegments.join('/');

    return (
      <section className="stack document-page">
        <div className="card document-header-card">
          <p className="eyebrow">Document</p>
          <h1>{document.title}</h1>
          <Breadcrumbs segments={directorySegments} currentLabel={slug.at(-1)} />
          <p className="muted mono document-path">{document.relativePath}</p>
          <div className="document-meta muted mono">
            <span>size: {formatFileSize(document.size)}</span>
            <span>updated: {formatDateTime(document.updatedAt)}</span>
            <span>headings: {stats.headingCount}</span>
            <span>links: {stats.linkCount}</span>
            <span>images: {stats.imageCount}</span>
            <span>read: {stats.readingMinutes} min</span>
          </div>
          <div className="actions document-actions">
            <Link href={toBrowseHref(directoryPath) as Route} className="button-link secondary">
              폴더로 돌아가기
            </Link>
          </div>
        </div>

        <DocumentReaderLayout
          tree={<DocumentTree title="현재 폴더" nodes={sidebarTree} activeRelativePath={document.relativePath} />}
          document={
            <>
              <article className="card markdown-body document-card">
                <MarkdownView content={content} currentRelativePath={document.relativePath} />
              </article>
              <PinnedDocuments
                currentDocument={{
                  relativePath: document.relativePath,
                  title: document.title,
                }}
                emptyMessage="자주 보는 문서를 pin 하면 여기에 고정됩니다."
              />
              <RecentDocuments
                currentDocument={{
                  relativePath: document.relativePath,
                  title: document.title,
                  viewedAt: document.updatedAt,
                }}
                emptyMessage="이 문서를 보기 시작하면 최근 본 문서가 여기에 쌓입니다."
              />
            </>
          }
          toc={<TableOfContents headings={headings} />}
        />
      </section>
    );
  } catch {
    notFound();
  }
}

function summarizeDocument(content: string, headingCount: number) {
  const compact = content.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]+`/g, ' ');
  const wordCount = compact.trim().split(/\s+/).filter(Boolean).length;
  const linkCount = [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].length;
  const imageCount = [...content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].length;

  return {
    headingCount,
    linkCount,
    imageCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
  };
}
