'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { DesktopContentRootEmptyState, DesktopErrorFallback } from '@/platform/desktop/renderer/desktop-error-fallback';
import { useDesktopContentRootQuery, useDesktopDocumentPageQuery } from '@/platform/desktop/renderer/desktop-queries';
import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import { buildBlockTextAnchor, createAnnotationId, createTimestamp, type AnnotationDocument, type DocumentAnnotation } from '@/shared/lib/annotations';
import type { DocumentTreeNode, MarkdownDocument } from '@/shared/lib/content-types';
import { formatDateTime, formatFileSize } from '@/shared/lib/format';
import { extractHeadings, preprocessWikiLinks, resolveWikiLinkHref } from '@/shared/lib/markdown';
import { stringifyMemoFile } from '@/shared/lib/memo-format';
import { toBrowseHref } from '@/shared/lib/routes';
import { writeLastDocumentState } from '@/shared/lib/view-state';
import { AppLink } from '@/shared/ui/app-link';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { DocumentFeedbackPanel } from '@/widgets/document/document-feedback-panel';
import { AnnotationSelectionPopover } from '@/widgets/document/annotation-selection-popover';
import { DocumentReaderLayout } from '@/widgets/document/document-reader-layout';
import { DocumentTree } from '@/widgets/document/document-tree';
import { MarkdownView } from '@/widgets/document/markdown-view';
import { PinnedDocuments } from '@/widgets/document/pinned-documents';
import { RecentDocuments } from '@/widgets/document/recent-documents';
import { TableOfContents } from '@/widgets/document/table-of-contents';
import { Breadcrumbs } from '@/widgets/navigation/breadcrumbs';
import { summarizeDocument } from '../lib/document-summary';

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
  rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
  range: Range;
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
  const [isDesktopChromeCollapsed, setIsDesktopChromeCollapsed] = useState(false);
  const [isTitleMetaOpen, setIsTitleMetaOpen] = useState(false);
  const content = useMemo(
    () => preprocessWikiLinks(document?.content ?? '', (rawTarget) => resolveWikiLinkHref(document?.relativePath ?? relativePath, rawTarget, knownDocuments)),
    [document?.content, document?.relativePath, knownDocuments, relativePath]
  );
  const headings = useMemo(() => extractHeadings(content), [content]);
  const stats = useMemo(() => summarizeDocument(content, headings.length), [content, headings.length]);
  const memoPreview = useMemo(() => {
    if (!document) {
      return '';
    }

    const annotationDocument: AnnotationDocument = {
      schemaVersion: 1,
      documentPath: document.relativePath,
      sourceUpdatedAt: document.updatedAt,
      annotations,
    };

    return stringifyMemoFile(annotationDocument);
  }, [annotations, document]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storageKey = 'markdeck:desktop-chrome-collapsed';
    const syncCollapsedState = () => {
      setIsDesktopChromeCollapsed(window.localStorage.getItem(storageKey) === 'true');
    };

    syncCollapsedState();
    window.addEventListener('markdeck:toggle-desktop-chrome', syncCollapsedState as EventListener);
    return () => window.removeEventListener('markdeck:toggle-desktop-chrome', syncCollapsedState as EventListener);
  }, []);

  useEffect(() => {
    if (!selectionDraft) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      restoreSelectionRange(selectionDraft.range);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectionDraft]);

  if (desktopRenderer && !contentRootQuery.isLoading && !contentRootQuery.data) {
    return <DesktopContentRootEmptyState />;
  }

  if (desktopRenderer && documentPageQuery.isError) {
    return <DesktopErrorFallback title="문서를 불러오지 못했습니다." error={documentPageQuery.error} onRetry={() => void documentPageQuery.refetch()} />;
  }

  if (!document) {
    return (
      <section className="stack document-page">
        <Card className="document-header-card">
          <CardHeader>
            <CardTitle>문서 불러오는 중…</CardTitle>
          </CardHeader>
          <CardContent>
          <Breadcrumbs segments={slug.slice(0, -1)} currentLabel={slug.at(-1)} />
          </CardContent>
        </Card>
      </section>
    );
  }

  const directorySegments = slug.slice(0, -1);
  const directoryPath = directorySegments.join('/');
  const restoreSelectionDraft = () => {
    if (!selectionDraft) {
      return;
    }

    restoreSelectionRange(selectionDraft.range);
  };

  const selectionPopoverPosition = selectionDraft ? resolveSelectionPopoverPosition(selectionDraft.rect) : null;

  const documentArticle = (
    <article className="card markdown-body document-card annotation-document-shell">
      <MarkdownView
        content={content}
        currentRelativePath={document.relativePath}
        annotations={annotations}
        activeSelection={selectionDraft}
        onSelectionChange={(draft) => {
          setSelectionDraft(draft);
        }}
        onToggleDeletion={({ blockId, blockText }) => {
          setAnnotations((current) => toggleDeletionAnnotation(current, blockId, blockText));
        }}
        onAddBlockHighlight={({ blockId, blockText }) => {
          const anchor = buildBlockTextAnchor(blockId, blockText);
          if (!anchor) {
            return;
          }

          setAnnotations((current) => [
            ...current,
            {
              id: createAnnotationId(),
              kind: 'highlight',
              color: 'yellow',
              createdAt: createTimestamp(),
              updatedAt: createTimestamp(),
              anchor,
            },
          ]);
        }}
        onAddBlockComment={({ blockId, blockText, comment }) => {
          const anchor = buildBlockTextAnchor(blockId, blockText);
          if (!anchor) {
            return;
          }

          setAnnotations((current) => [
            ...current,
            {
              id: createAnnotationId(),
              kind: 'comment',
              color: 'yellow',
              comment,
              createdAt: createTimestamp(),
              updatedAt: createTimestamp(),
              anchor,
            },
          ]);
        }}
      />
      {selectionDraft && selectionPopoverPosition ? (
        <AnnotationSelectionPopover
          selectionDraft={selectionDraft}
          position={selectionPopoverPosition}
          onRestoreSelection={restoreSelectionDraft}
          onClose={() => setSelectionDraft(null)}
          onAddHighlight={(annotation) => {
            setAnnotations((current) => [...current, annotation]);
            setSelectionDraft(null);
          }}
          onAddStrike={(annotation) => {
            setAnnotations((current) => [...current, annotation]);
            setSelectionDraft(null);
          }}
          onAddComment={(annotation) => {
            setAnnotations((current) => [...current, annotation]);
            setSelectionDraft(null);
          }}
        />
      ) : null}
    </article>
  );

  return (
    <section className="stack document-page">
      <Card className="document-header-card">
        <CardHeader className={`document-header-card-header${isDesktopChromeCollapsed ? ' is-collapsed' : ''}`}>
          {isDesktopChromeCollapsed ? (
            <div className="document-header-compact-row">
              <div className="document-header-compact-path">
                <Breadcrumbs segments={directorySegments} currentLabel={undefined} />
              </div>
              <div
                className="document-title-popover-anchor document-header-compact-title"
                onMouseEnter={() => setIsTitleMetaOpen(true)}
                onMouseLeave={() => setIsTitleMetaOpen(false)}
                onFocus={() => setIsTitleMetaOpen(true)}
                onBlur={() => setIsTitleMetaOpen(false)}
              >
                <CardTitle tabIndex={0}>{document.title}</CardTitle>
                {isTitleMetaOpen ? (
                  <Card className="document-title-popover" size="sm">
                    <CardContent className="document-meta muted mono">
                      <span>size: {formatFileSize(document.size)}</span>
                      <span>updated: {formatDateTime(document.updatedAt)}</span>
                      <span>headings: {stats.headingCount}</span>
                      <span>links: {stats.linkCount}</span>
                      <span>images: {stats.imageCount}</span>
                      <span>read: {stats.readingMinutes} min</span>
                      <span>annotations: {annotations.length}</span>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className="document-title-popover-anchor"
              onMouseEnter={() => setIsTitleMetaOpen(true)}
              onMouseLeave={() => setIsTitleMetaOpen(false)}
              onFocus={() => setIsTitleMetaOpen(true)}
              onBlur={() => setIsTitleMetaOpen(false)}
            >
              <CardTitle tabIndex={0}>{document.title}</CardTitle>
              {isTitleMetaOpen ? (
                <Card className="document-title-popover" size="sm">
                  <CardContent className="document-meta muted mono">
                    <span>size: {formatFileSize(document.size)}</span>
                    <span>updated: {formatDateTime(document.updatedAt)}</span>
                    <span>headings: {stats.headingCount}</span>
                    <span>links: {stats.linkCount}</span>
                    <span>images: {stats.imageCount}</span>
                    <span>read: {stats.readingMinutes} min</span>
                    <span>annotations: {annotations.length}</span>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </CardHeader>
        <CardContent className={`stack document-header-card-content${isDesktopChromeCollapsed ? ' is-collapsed' : ''}`}>
          {isDesktopChromeCollapsed ? null : <Breadcrumbs segments={directorySegments} currentLabel={slug.at(-1)} />}
          <div className="actions document-actions">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="document-header-toggle-button"
              onClick={() => window.dispatchEvent(new CustomEvent('markdeck:toggle-desktop-chrome'))}
              aria-pressed={isDesktopChromeCollapsed}
              aria-label={isDesktopChromeCollapsed ? '상단 영역 펼치기' : '상단 영역 접기'}
            >
              {isDesktopChromeCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DocumentReaderLayout
        contentRootKey={contentRootKey}
        tree={<DocumentTree title="현재 폴더" nodes={sidebarTree} activeRelativePath={document.relativePath} storageScope={contentRootKey} />}
        document={
          <>
            {documentArticle}
            <div className="card stack">
              <div className="document-panel-header">
                <div>
                  <p className="eyebrow">Memo</p>
                  <h2>.memo preview</h2>
                </div>
              </div>
              <p className="muted">현재 annotation 상태를 sidecar `.memo` 형식으로 직렬화한 미리보기입니다.</p>
              <pre className="feedback-share-preview">{memoPreview || '{\n  "operations": []\n}'}</pre>
            </div>
            <PinnedDocuments currentDocument={{ relativePath: document.relativePath, title: document.title }} emptyMessage="자주 보는 문서를 pin 하면 여기에 고정됩니다." />
            <RecentDocuments currentDocument={{ relativePath: document.relativePath, title: document.title, viewedAt: document.updatedAt }} emptyMessage="이 문서를 보기 시작하면 최근 본 문서가 여기에 쌓입니다." />
          </>
        }
        maximizedDocument={documentArticle}
        feedback={<DocumentFeedbackPanel annotations={annotations} onDeleteAnnotation={(annotationId) => setAnnotations((current) => current.filter((annotation) => annotation.id !== annotationId))} />}
        toc={<TableOfContents headings={headings} />}
      />
    </section>
  );
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

function restoreSelectionRange(range: Range) {
  if (typeof window === 'undefined') {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  selection.removeAllRanges();
  selection.addRange(range.cloneRange());
}

function resolveSelectionPopoverPosition(rect: SelectionDraft['rect']) {
  if (typeof window === 'undefined') {
    return null;
  }

  const popoverWidth = Math.min(320, window.innerWidth - 32);
  const horizontalPadding = 12;
  const verticalGap = 10;
  const estimatedPopoverHeight = 172;
  const viewportBottom = window.innerHeight;
  const viewportRight = window.innerWidth;
  const selectionCenter = rect.left + rect.width / 2;
  const preferredNearSelection = rect.left + Math.min(Math.max(rect.width * 0.35, 20), 72);
  const preferredLeft = Math.min(preferredNearSelection, selectionCenter - popoverWidth / 2);
  const minLeft = horizontalPadding;
  const maxLeft = Math.max(minLeft, viewportRight - popoverWidth - horizontalPadding);
  const left = Math.min(Math.max(preferredLeft, minLeft), maxLeft);

  const belowTop = rect.bottom + verticalGap;
  const aboveTop = rect.top - estimatedPopoverHeight - verticalGap;
  const fitsBelow = belowTop + estimatedPopoverHeight <= viewportBottom - horizontalPadding;
  const top = fitsBelow ? belowTop : Math.max(horizontalPadding, aboveTop);

  return {
    top,
    left,
    placement: fitsBelow ? 'bottom' as const : 'top' as const,
  };
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
