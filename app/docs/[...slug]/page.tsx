import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MarkdownView } from '@/components/MarkdownView';
import { RecentDocuments } from '@/components/RecentDocuments';
import { TableOfContents } from '@/components/TableOfContents';
import { collectMarkdownRelativePaths, readMarkdownDocument } from '@/lib/content';
import { toBrowseHref } from '@/lib/routes';
import { formatDateTime, formatFileSize, joinSegments } from '@/lib/format';
import { extractHeadings, preprocessWikiLinks, resolveWikiLinkHref } from '@/lib/markdown';

export default async function DocumentPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  const slug = joinSegments(resolvedParams);

  try {
    const document = await readMarkdownDocument(slug);
    const [knownDocuments] = await Promise.all([collectMarkdownRelativePaths()]);
    const content = preprocessWikiLinks(document.content, (rawTarget) =>
      resolveWikiLinkHref(document.relativePath, rawTarget, knownDocuments)
    );
    const headings = extractHeadings(content);
    const directoryPath = slug.slice(0, -1).join('/');

    return (
      <section className="stack document-page">
        <div className="card document-header-card">
          <p className="eyebrow">Document</p>
          <h1>{document.title}</h1>
          <Breadcrumbs segments={slug.slice(0, -1)} currentLabel={slug.at(-1)} />
          <p className="muted mono document-path">{document.relativePath}</p>
          <div className="document-meta muted mono">
            <span>size: {formatFileSize(document.size)}</span>
            <span>updated: {formatDateTime(document.updatedAt)}</span>
          </div>
          <div className="actions document-actions">
            <Link href={toBrowseHref(directoryPath) as Route} className="button-link secondary">
              폴더로 돌아가기
            </Link>
          </div>
        </div>

        <div className="document-layout">
          <div className="document-main stack">
            <article className="card markdown-body document-card">
              <MarkdownView content={content} currentRelativePath={document.relativePath} />
            </article>
            <RecentDocuments
              currentDocument={{
                relativePath: document.relativePath,
                title: document.title,
                viewedAt: document.updatedAt,
              }}
              emptyMessage="이 문서를 보기 시작하면 최근 본 문서가 여기에 쌓입니다."
            />
          </div>
          <div className="document-side stack">
            <TableOfContents headings={headings} />
          </div>
        </div>
      </section>
    );
  } catch {
    notFound();
  }
}
