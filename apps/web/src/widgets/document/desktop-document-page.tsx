'use client';

import { useMemo } from 'react';

import { useDesktopDocumentPageQuery } from '@/platform/desktop/renderer/desktop-queries';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import type { DocumentTreeNode, MarkdownDocument } from '@/shared/lib/content-types';
import { formatDateTime, formatFileSize } from '@/shared/lib/format';
import { extractHeadings, preprocessWikiLinks, resolveWikiLinkHref } from '@/shared/lib/markdown';
import { toBrowseHref } from '@/shared/lib/routes';
import { AppLink } from '@/shared/ui/app-link';
import { DocumentReaderLayout } from '@/widgets/document/document-reader-layout';
import { DocumentTree } from '@/widgets/document/document-tree';
import { MarkdownView } from '@/widgets/document/markdown-view';
import { PinnedDocuments } from '@/widgets/document/pinned-documents';
import { RecentDocuments } from '@/widgets/document/recent-documents';
import { TableOfContents } from '@/widgets/document/table-of-contents';
import { Breadcrumbs } from '@/widgets/navigation/breadcrumbs';

interface DesktopDocumentPageProps {
  slug: string[];
  initialDocument?: MarkdownDocument | null;
  initialKnownDocuments: string[];
  initialSidebarTree: DocumentTreeNode[];
}

export function DesktopDocumentPage({ slug, initialDocument = null, initialKnownDocuments, initialSidebarTree }: DesktopDocumentPageProps) {
  const desktopRenderer = useDesktopRenderer();
  const relativePath = slug.join('/');
  const documentPageQuery = useDesktopDocumentPageQuery(relativePath, desktopRenderer);
  const document = desktopRenderer ? documentPageQuery.data?.document ?? null : initialDocument;
  const knownDocuments = desktopRenderer ? documentPageQuery.data?.knownDocuments ?? [] : initialKnownDocuments;
  const sidebarTree = desktopRenderer ? documentPageQuery.data?.sidebarTree ?? [] : initialSidebarTree;

  if (!document) {
    return (
      <section className="stack document-page">
        <div className="card document-header-card">
          <p className="eyebrow">Document</p>
          <h1>{desktopRenderer && documentPageQuery.isError ? '문서를 불러오지 못했습니다.' : '문서 불러오는 중…'}</h1>
          <Breadcrumbs segments={slug.slice(0, -1)} currentLabel={slug.at(-1)} />
        </div>
      </section>
    );
  }

  const content = useMemo(() => preprocessWikiLinks(document.content, (rawTarget) => resolveWikiLinkHref(document.relativePath, rawTarget, knownDocuments)), [document.content, document.relativePath, knownDocuments]);
  const headings = useMemo(() => extractHeadings(content), [content]);
  const stats = useMemo(() => summarizeDocument(content, headings.length), [content, headings.length]);
  const directorySegments = slug.slice(0, -1);
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
          <AppLink href={toBrowseHref(directoryPath)} className="button-link secondary">
            폴더로 돌아가기
          </AppLink>
        </div>
      </div>

      <DocumentReaderLayout
        tree={<DocumentTree title="현재 폴더" nodes={sidebarTree} activeRelativePath={document.relativePath} />}
        document={
          <>
            <article className="card markdown-body document-card">
              <MarkdownView content={content} currentRelativePath={document.relativePath} />
            </article>
            <PinnedDocuments currentDocument={{ relativePath: document.relativePath, title: document.title }} emptyMessage="자주 보는 문서를 pin 하면 여기에 고정됩니다." />
            <RecentDocuments currentDocument={{ relativePath: document.relativePath, title: document.title, viewedAt: document.updatedAt }} emptyMessage="이 문서를 보기 시작하면 최근 본 문서가 여기에 쌓입니다." />
          </>
        }
        toc={<TableOfContents headings={headings} />}
      />
    </section>
  );
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
