'use client';

import { MessageSquareText, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { findQuotedTextRange, normalizeWhitespace, type AnnotationTextAnchor, type CommentAnnotation, type DeletionAnnotation, type DocumentAnnotation } from '@/shared/lib/annotations';
import { resolveAssetHref, isImageAsset } from '@/shared/lib/assets';
import { resolveMarkdownLink } from '@/shared/lib/content-links';
import { createSlugger, extractCodeText } from '@/shared/lib/markdown';
import { AppAnchorLink, AppLink } from '@/shared/ui/app-link';
import { Button } from '@/shared/ui/button';
import { CodeBlock } from '@/shared/ui/code-block';
import { DesktopAssetLink } from '@/shared/ui/desktop-asset';
import { MarkdownImage } from '@/shared/ui/markdown-image';
import { MermaidBlock } from '@/shared/ui/mermaid-block';

interface SelectionDraft {
  text: string;
  blockId: string;
  quote: string;
  occurrence: number;
  prefix: string;
  suffix: string;
  rect: { top: number; left: number; bottom: number; width: number };
  range: Range;
}

interface MarkdownViewProps {
  content: string;
  currentRelativePath: string;
  annotations?: DocumentAnnotation[];
  activeSelection?: SelectionDraft | null;
  onSelectionChange?: (selection: SelectionDraft | null) => void;
  onToggleDeletion?: (payload: { blockId: string; blockText: string }) => void;
}

export function MarkdownView({ content, currentRelativePath, annotations = [], activeSelection = null, onSelectionChange, onToggleDeletion }: MarkdownViewProps) {
  const createHeadingId = createSlugger();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const deletedBlockIds = useMemo(
    () => new Set(annotations.filter((annotation): annotation is DeletionAnnotation => annotation.kind === 'deletion').map((annotation) => annotation.anchor.blockId)),
    [annotations]
  );
  const commentAnnotationsByBlockId = useMemo(() => {
    const next = new Map<string, CommentAnnotation[]>();

    annotations.forEach((annotation) => {
      if (annotation.kind !== 'comment' || annotation.anchor.kind !== 'text-range') {
        return;
      }

      const blockComments = next.get(annotation.anchor.blockId) ?? [];
      blockComments.push(annotation);
      next.set(annotation.anchor.blockId, blockComments);
    });

    return next;
  }, [annotations]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    cleanupAnnotationMarks(container);

    if (activeSelection) {
      const activeBlock = container.querySelector<HTMLElement>(`[data-annotation-block-id="${activeSelection.blockId}"]`);
      if (activeBlock) {
        applyTemporarySelectionMark(activeBlock, activeSelection);
      }
    }

    annotations.forEach((annotation) => {
      if (annotation.anchor.kind === 'block' && annotation.kind === 'deletion') {
        const block = container.querySelector<HTMLElement>(`[data-annotation-block-id="${annotation.anchor.blockId}"]`);
        if (block) {
          block.dataset.annotationDeleted = 'true';
        }
        return;
      }

      if (annotation.anchor.kind !== 'text-range') {
        return;
      }

      const block = container.querySelector<HTMLElement>(`[data-annotation-block-id="${annotation.anchor.blockId}"]`);
      if (!block) {
        return;
      }

      applyTextAnnotation(block, annotation.id, annotation.anchor, annotation.kind);
    });
  }, [activeSelection, annotations]);

  function handleMouseUp() {
    if (!onSelectionChange || !containerRef.current) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      onSelectionChange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      onSelectionChange(null);
      return;
    }

    const block = getClosestBlock(range.commonAncestorContainer);
    if (!block) {
      onSelectionChange(null);
      return;
    }

    const blockId = block.dataset.annotationBlockId;
    if (!blockId) {
      onSelectionChange(null);
      return;
    }

    const text = normalizeWhitespace(selection.toString());
    const blockText = normalizeWhitespace(block.innerText);
    if (!text || !blockText.includes(text)) {
      onSelectionChange(null);
      return;
    }

    const occurrence = countTextOccurrences(blockText, text, range, block);
    const match = buildSelectionContext(blockText, text, occurrence);
    const rect = range.getBoundingClientRect();

    onSelectionChange({
      text,
      blockId,
      quote: match.quote,
      occurrence: match.occurrence,
      prefix: match.prefix,
      suffix: match.suffix,
      rect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        width: rect.width,
      },
      range: range.cloneRange(),
    });
  }

  return (
    <div ref={containerRef} className="markdown-annotation-surface" onMouseUp={handleMouseUp}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = '', children }) => {
            if (href.startsWith('/docs/') || href.startsWith('/browse/')) {
              return <AppLink href={href}>{children}</AppLink>;
            }

            const isSpecialHref = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#');
            const resolvedMarkdown = resolveMarkdownLink(currentRelativePath, href);

            if (!resolvedMarkdown || (resolvedMarkdown === href && isSpecialHref)) {
              return <AppAnchorLink href={href}>{children}</AppAnchorLink>;
            }

            if (href.startsWith('http://') || href.startsWith('https://')) {
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            }

            if (!href.endsWith('.md')) {
              const assetHref = resolveAssetHref(currentRelativePath, href);
              const relativeAssetPath = assetHref.replace(/^\/assets\//, '');

              return (
                <DesktopAssetLink relativePath={decodeURIComponent(relativeAssetPath)} fallbackHref={assetHref}>
                  {children}
                </DesktopAssetLink>
              );
            }

            return <AppLink href={resolvedMarkdown}>{children}</AppLink>;
          },
          img: ({ src = '', alt = '' }) => {
            const assetHref = resolveAssetHref(currentRelativePath, src);

            if (!assetHref || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
              return <img src={src} alt={alt} className="markdown-image" />;
            }

            if (!isImageAsset(src)) {
              const relativeAssetPath = assetHref.replace(/^\/assets\//, '');
              return (
                <DesktopAssetLink relativePath={decodeURIComponent(relativeAssetPath)} fallbackHref={assetHref}>
                  {alt || src}
                </DesktopAssetLink>
              );
            }

            return <MarkdownImage src={src} alt={alt} currentRelativePath={currentRelativePath} />;
          },
          h1: ({ children }) => {
            const text = extractPlainText(children);
            const blockId = createHeadingIdFromText(text);

            return (
              <Heading
                level={1}
                id={createHeadingId(text)}
                text={text}
                deleted={deletedBlockIds.has(blockId)}
                comments={commentAnnotationsByBlockId.get(blockId) ?? []}
                onToggleDeletion={onToggleDeletion}
              >
                {children}
              </Heading>
            );
          },
          h2: ({ children }) => {
            const text = extractPlainText(children);
            const blockId = createHeadingIdFromText(text);

            return (
              <Heading
                level={2}
                id={createHeadingId(text)}
                text={text}
                deleted={deletedBlockIds.has(blockId)}
                comments={commentAnnotationsByBlockId.get(blockId) ?? []}
                onToggleDeletion={onToggleDeletion}
              >
                {children}
              </Heading>
            );
          },
          h3: ({ children }) => {
            const text = extractPlainText(children);
            const blockId = createHeadingIdFromText(text);

            return (
              <Heading
                level={3}
                id={createHeadingId(text)}
                text={text}
                deleted={deletedBlockIds.has(blockId)}
                comments={commentAnnotationsByBlockId.get(blockId) ?? []}
                onToggleDeletion={onToggleDeletion}
              >
                {children}
              </Heading>
            );
          },
          p: ({ children }) => {
            const text = extractPlainText(children);
            const blockId = createHeadingIdFromText(text);

            return (
              <Block
                levelTag="p"
                text={text}
                deleted={deletedBlockIds.has(blockId)}
                comments={commentAnnotationsByBlockId.get(blockId) ?? []}
                onToggleDeletion={onToggleDeletion}
              >
                {children}
              </Block>
            );
          },
          blockquote: ({ children }) => {
            const text = extractPlainText(children);
            const blockId = createHeadingIdFromText(text);

            return (
              <Block
                levelTag="blockquote"
                text={text}
                deleted={deletedBlockIds.has(blockId)}
                comments={commentAnnotationsByBlockId.get(blockId) ?? []}
                onToggleDeletion={onToggleDeletion}
              >
                {children}
              </Block>
            );
          },
          li: ({ children }) => {
            const text = extractPlainText(children);
            const blockId = createHeadingIdFromText(text);

            return (
              <Block
                levelTag="li"
                text={text}
                deleted={deletedBlockIds.has(blockId)}
                comments={commentAnnotationsByBlockId.get(blockId) ?? []}
                onToggleDeletion={onToggleDeletion}
              >
                {children}
              </Block>
            );
          },
          code: ({ className, children }) => {
            const language = className?.replace('language-', '').trim();
            const code = extractCodeText(children).replace(/\n$/, '');
            const isInline = !className && !code.includes('\n');

            if (isInline) {
              return <code className={className}>{children}</code>;
            }

            if (language === 'mermaid') {
              return <MermaidBlock chart={code.trim()} />;
            }

            return <CodeBlock code={code} language={language} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function Block({
  levelTag,
  text,
  deleted,
  comments,
  onToggleDeletion,
  children,
}: {
  levelTag: 'p' | 'li' | 'blockquote';
  text: string;
  deleted: boolean;
  comments: CommentAnnotation[];
  onToggleDeletion?: (payload: { blockId: string; blockText: string }) => void;
  children: React.ReactNode;
}) {
  const blockId = createHeadingIdFromText(text);
  const Tag = levelTag;

  return (
    <Tag className="annotation-block" data-annotation-block-id={blockId} data-annotation-deleted={deleted ? 'true' : undefined}>
      <BlockCommentPreview comments={comments} />
      {onToggleDeletion ? (
        <Button
          type="button"
          variant={deleted ? 'destructive' : 'ghost'}
          size="icon-xs"
          className="annotation-delete-button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleDeletion({ blockId, blockText: normalizeWhitespace(text) });
          }}
          title={deleted ? '삭제 표시 해제' : '이 문단 삭제 표시'}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
      {children}
    </Tag>
  );
}

function Heading({
  level,
  id,
  text,
  deleted,
  comments,
  onToggleDeletion,
  children,
}: {
  level: 1 | 2 | 3;
  id: string;
  text: string;
  deleted: boolean;
  comments: CommentAnnotation[];
  onToggleDeletion?: (payload: { blockId: string; blockText: string }) => void;
  children: React.ReactNode;
}) {
  const Tag = `h${level}` as const;
  const blockId = createHeadingIdFromText(text);

  return (
    <Tag id={id} className="annotation-block" data-annotation-block-id={blockId} data-annotation-deleted={deleted ? 'true' : undefined}>
      <BlockCommentPreview comments={comments} />
      {onToggleDeletion ? (
        <Button
          type="button"
          variant={deleted ? 'destructive' : 'ghost'}
          size="icon-xs"
          className="annotation-delete-button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleDeletion({ blockId, blockText: normalizeWhitespace(text) });
          }}
          title={deleted ? '삭제 표시 해제' : '이 헤더 삭제 표시'}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
      <a href={`#${id}`} className="heading-anchor">
        <span className="heading-anchor-mark">#</span>
      </a>
      {children}
    </Tag>
  );
}

function BlockCommentPreview({ comments }: { comments: CommentAnnotation[] }) {
  const [open, setOpen] = useState(false);

  if (comments.length === 0) {
    return null;
  }

  return (
    <div
      className="annotation-comment-preview"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        setOpen(false);
      }}
    >
      <button
        type="button"
        className="annotation-comment-indicator"
        aria-label={`이 블록에 코멘트 ${comments.length}개`}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MessageSquareText className="size-3.5" />
      </button>
      {open ? (
        <div className="annotation-comment-preview-popover" role="dialog" aria-label="코멘트 미리보기">
          <strong>코멘트 {comments.length}개</strong>
          <div className="annotation-comment-preview-list">
            {comments.map((comment) => (
              <div key={comment.id} className="annotation-comment-preview-item">
                <p className="annotation-comment-preview-body">{comment.comment}</p>
                <p className="annotation-comment-preview-quote">“{comment.anchor.kind === 'text-range' ? comment.anchor.quote : ''}”</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function createHeadingIdFromText(text: string) {
  return normalizeWhitespace(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'block';
}

function extractPlainText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractPlainText(child)).join(' ');
  }

  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return extractPlainText(props?.children ?? '');
  }

  return '';
}

function getClosestBlock(node: Node) {
  if (node instanceof HTMLElement) {
    return node.closest<HTMLElement>('[data-annotation-block-id]');
  }

  return node.parentElement?.closest<HTMLElement>('[data-annotation-block-id]') ?? null;
}

function buildSelectionContext(blockText: string, quote: string, occurrence: number) {
  let fromIndex = 0;
  let index = -1;
  for (let step = 0; step <= occurrence; step += 1) {
    index = blockText.indexOf(quote, fromIndex);
    if (index === -1) {
      index = blockText.indexOf(quote);
      break;
    }
    fromIndex = index + quote.length;
  }

  const safeIndex = Math.max(0, index);
  return {
    quote,
    occurrence,
    prefix: blockText.slice(Math.max(0, safeIndex - 24), safeIndex),
    suffix: blockText.slice(safeIndex + quote.length, safeIndex + quote.length + 24),
  };
}

function countTextOccurrences(blockText: string, quote: string, range: Range, block: HTMLElement) {
  const preRange = document.createRange();
  preRange.selectNodeContents(block);
  preRange.setEnd(range.startContainer, range.startOffset);
  const beforeText = normalizeWhitespace(preRange.toString());
  let occurrence = 0;
  let fromIndex = 0;

  while (fromIndex >= 0) {
    const matchIndex = blockText.indexOf(quote, fromIndex);
    if (matchIndex === -1 || matchIndex > beforeText.length) {
      break;
    }

    occurrence += 1;
    fromIndex = matchIndex + quote.length;
  }

  return Math.max(0, occurrence - 1);
}

function cleanupAnnotationMarks(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>('[data-annotation-mark="true"], [data-annotation-selection-mark="true"]').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }

    parent.removeChild(mark);
  });

  container.querySelectorAll<HTMLElement>('[data-annotation-block-id]').forEach((block) => {
    delete block.dataset.annotationDeleted;
  });
}

function applyTemporarySelectionMark(block: HTMLElement, selection: SelectionDraft) {
  const range = locateTextRange(block, {
    kind: 'text-range',
    blockId: selection.blockId,
    quote: selection.quote,
    occurrence: selection.occurrence,
    prefix: selection.prefix,
    suffix: selection.suffix,
  });
  if (!range) {
    return;
  }

  const mark = document.createElement('mark');
  mark.dataset.annotationSelectionMark = 'true';
  mark.className = 'annotation-inline-mark is-active-selection';
  try {
    range.surroundContents(mark);
  } catch {
    wrapRangeContents(range, mark);
  }
}

function applyTextAnnotation(block: HTMLElement, annotationId: string, anchor: AnnotationTextAnchor, kind: DocumentAnnotation['kind']) {
  const range = locateTextRange(block, anchor);
  if (!range) {
    return;
  }

  const mark = document.createElement('mark');
  mark.dataset.annotationMark = 'true';
  mark.dataset.annotationId = annotationId;
  mark.className =
    kind === 'comment'
      ? 'annotation-inline-mark is-comment'
      : kind === 'strike'
        ? 'annotation-inline-mark is-strike'
        : 'annotation-inline-mark';
  try {
    range.surroundContents(mark);
  } catch {
    wrapRangeContents(range, mark);
  }
}

function wrapRangeContents(range: Range, wrapper: HTMLElement) {
  const extracted = range.extractContents();
  if (!extracted.textContent?.trim()) {
    return;
  }

  wrapper.appendChild(extracted);
  range.insertNode(wrapper);
}

function locateTextRange(block: HTMLElement, anchor: AnnotationTextAnchor) {
  const normalizedText = normalizeWhitespace(block.innerText);
  const target = findQuotedTextRange(normalizedText, anchor);
  if (!target) {
    return null;
  }

  const mapping = buildNormalizedTextMapping(block);
  const startPoint = mapping[target.start];
  const endPoint = mapping[target.end - 1];
  if (!startPoint || !endPoint) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset + 1);
  return range;
}

function buildNormalizedTextMapping(block: HTMLElement) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const points: Array<{ node: Text; offset: number }> = [];
  let lastWasWhitespace = false;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = node.textContent ?? '';

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const isWhitespace = /\s/.test(char);

      if (isWhitespace) {
        if (lastWasWhitespace) {
          continue;
        }

        points.push({ node, offset: index });
        lastWasWhitespace = true;
        continue;
      }

      points.push({ node, offset: index });
      lastWasWhitespace = false;
    }
  }

  return points;
}
