'use client';

import { useEffect, useMemo, useState } from 'react';

import { DesktopContentRootEmptyState, DesktopErrorFallback } from '@/platform/desktop/renderer/desktop-error-fallback';
import { useDesktopContentRootQuery, useDesktopDocumentPageQuery } from '@/platform/desktop/renderer/desktop-queries';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import { createAnnotationId, createTimestamp, type CommentAnnotation, type DocumentAnnotation, type HighlightAnnotation } from '@/shared/lib/annotations';
import type { DocumentTreeNode, MarkdownDocument } from '@/shared/lib/content-types';
import { formatDateTime, formatFileSize } from '@/shared/lib/format';
import { extractHeadings, preprocessWikiLinks, resolveWikiLinkHref } from '@/shared/lib/markdown';
import { toBrowseHref } from '@/shared/lib/routes';
import { writeLastDocumentState } from '@/shared/lib/view-state';
import { AppLink } from '@/shared/ui/app-link';
import { Button } from '@/shared/ui/button';
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

interface SelectionDraft {
  text: string;
  blockId: string;
  quote: string;
  occurrence: number;
  prefix: string;
  suffix: string;
  rect: { top: number; left: number; bottom: number };
}

export function DesktopDocumentPage({ slug, initialDocument = null, initialKnownDocuments, initialSidebarTree }: DesktopDocumentPageProps) {
  const desktopRenderer = useDesktopRenderer();
  const relativePath = slug.join('/');
  const contentRootQuery = useDesktopContentRootQuery(desktopRenderer);
  const documentPageQuery = useDesktopDocumentPageQuery(relativePath, desktopRenderer);
  const document = desktopRenderer ? documentPageQuery.data?.document ?? null : initialDocument;
  const knownDocuments = desktopRenderer ? documentPageQuery.data?.knownDocuments ?? [] : initialKnownDocuments;
  const sidebarTree = desktopRenderer ? documentPageQuery.data?.sidebarTree ?? [] : initialSidebarTree;
  const contentRootKey = contentRootQuery.data ?? 'web';
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const content = useMemo(
    () => preprocessWikiLinks(document?.content ?? '', (rawTarget) => resolveWikiLinkHref(document?.relativePath ?? relativePath, rawTarget, knownDocuments)),
    [document?.content, document?.relativePath, knownDocuments, relativePath]
  );
  const headings = useMemo(() => extractHeadings(content), [content]);
  const stats = useMemo(() => summarizeDocument(content, headings.length), [content, headings.length]);

  useEffect(() => {
    if (!document) {
      return;
    }

    setAnnotations(readAnnotations(document.relativePath));
  }, [document?.relativePath]);

  useEffect(() => {
    if (!document) {
      return;
    }

    writeAnnotations(document.relativePath, annotations);
  }, [annotations, document]);

  useEffect(() => {
    if (!document) {
      return;
    }

    if (desktopRenderer && !contentRootQuery.data) {
      return;
    }

    writeLastDocumentState({
      contentRootKey,
      relativePath: document.relativePath,
      title: document.title,
      viewedAt: new Date().toISOString(),
    });
  }, [contentRootKey, contentRootQuery.data, desktopRenderer, document]);

  if (desktopRenderer && !contentRootQuery.isLoading && !contentRootQuery.data) {
    return <DesktopContentRootEmptyState />;
  }

  if (desktopRenderer && documentPageQuery.isError) {
    return <DesktopErrorFallback title="문서를 불러오지 못했습니다." error={documentPageQuery.error} onRetry={() => void documentPageQuery.refetch()} />;
  }

  if (!document) {
    return (
      <section className="stack document-page">
        <div className="card document-header-card">
          <p className="eyebrow">Document</p>
          <h1>문서 불러오는 중…</h1>
          <Breadcrumbs segments={slug.slice(0, -1)} currentLabel={slug.at(-1)} />
        </div>
      </section>
    );
  }

  const directorySegments = slug.slice(0, -1);
  const directoryPath = directorySegments.join('/');
  const documentArticle = (
    <article className="card markdown-body document-card annotation-document-shell">
      <MarkdownView
        content={content}
        currentRelativePath={document.relativePath}
        annotations={annotations}
        onSelectionChange={(draft) => {
          setSelectionDraft(draft);
          setCommentDraft('');
        }}
        onToggleDeletion={({ blockId, blockText }) => {
          setAnnotations((current) => toggleDeletionAnnotation(current, blockId, blockText));
        }}
      />
      {selectionDraft ? (
        <div className="annotation-selection-popover" style={{ top: `${selectionDraft.rect.bottom + 8}px`, left: `${selectionDraft.rect.left}px` }}>
          <div className="annotation-selection-toolbar">
            <Button type="button" size="sm" onClick={() => {
              const annotation: HighlightAnnotation = {
                id: createAnnotationId(),
                kind: 'highlight',
                color: 'yellow',
                createdAt: createTimestamp(),
                updatedAt: createTimestamp(),
                anchor: {
                  kind: 'text-range',
                  blockId: selectionDraft.blockId,
                  quote: selectionDraft.quote,
                  occurrence: selectionDraft.occurrence,
                  prefix: selectionDraft.prefix,
                  suffix: selectionDraft.suffix,
                },
              };
              setAnnotations((current) => [...current, annotation]);
              setSelectionDraft(null);
            }}>하이라이트</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCommentDraft((current) => current || selectionDraft.text)}>코멘트</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelectionDraft(null)}>닫기</Button>
          </div>
          {commentDraft ? (
            <div className="annotation-comment-form">
              <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="선택한 영역에 대한 코멘트를 적어 주세요" />
              <div className="annotation-comment-actions">
                <Button type="button" size="sm" onClick={() => {
                  const trimmed = commentDraft.trim();
                  if (!trimmed) {
                    return;
                  }
                  const annotation: CommentAnnotation = {
                    id: createAnnotationId(),
                    kind: 'comment',
                    color: 'yellow',
                    comment: trimmed,
                    createdAt: createTimestamp(),
                    updatedAt: createTimestamp(),
                    anchor: {
                      kind: 'text-range',
                      blockId: selectionDraft.blockId,
                      quote: selectionDraft.quote,
                      occurrence: selectionDraft.occurrence,
                      prefix: selectionDraft.prefix,
                      suffix: selectionDraft.suffix,
                    },
                  };
                  setAnnotations((current) => [...current, annotation]);
                  setCommentDraft('');
                  setSelectionDraft(null);
                }}>코멘트 저장</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );

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
          <span>annotations: {annotations.length}</span>
        </div>
        <div className="actions document-actions">
          <AppLink href={toBrowseHref(directoryPath)} className="button-link secondary">
            폴더로 돌아가기
          </AppLink>
        </div>
      </div>

      <DocumentReaderLayout
        tree={<DocumentTree title="현재 폴더" nodes={sidebarTree} activeRelativePath={document.relativePath} storageScope={contentRootKey} />}
        document={
          <>
            {documentArticle}
            <PinnedDocuments currentDocument={{ relativePath: document.relativePath, title: document.title }} emptyMessage="자주 보는 문서를 pin 하면 여기에 고정됩니다." />
            <RecentDocuments currentDocument={{ relativePath: document.relativePath, title: document.title, viewedAt: document.updatedAt }} emptyMessage="이 문서를 보기 시작하면 최근 본 문서가 여기에 쌓입니다." />
          </>
        }
        maximizedDocument={documentArticle}
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

function annotationStorageKey(relativePath: string) {
  return `markdeck:annotations:${relativePath}`;
}

function readAnnotations(relativePath: string): DocumentAnnotation[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(annotationStorageKey(relativePath));
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as DocumentAnnotation[];
  } catch {
    return [];
  }
}

function writeAnnotations(relativePath: string, annotations: DocumentAnnotation[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(annotationStorageKey(relativePath), JSON.stringify(annotations));
}

function toggleDeletionAnnotation(current: DocumentAnnotation[], blockId: string, blockText: string) {
  const existing = current.find((annotation) => annotation.kind === 'deletion' && annotation.anchor.kind === 'block' && annotation.anchor.blockId === blockId);
  if (existing) {
    return current.filter((annotation) => annotation.id !== existing.id);
  }

  const annotation: DocumentAnnotation = {
    id: createAnnotationId(),
    kind: 'deletion',
    reason: `문단 삭제 제안: ${blockText.slice(0, 80)}`,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    anchor: {
      kind: 'block',
      blockId,
    },
  };

  return [...current, annotation];
}

