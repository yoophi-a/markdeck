export const MARKDECK_ANNOTATION_SCHEMA_VERSION = 1;

export const annotationKinds = ['highlight', 'comment', 'deletion'] as const;
export type AnnotationKind = (typeof annotationKinds)[number];

export const annotationAnchorKinds = ['text-range', 'block'] as const;
export type AnnotationAnchorKind = (typeof annotationAnchorKinds)[number];

export interface AnnotationTextAnchor {
  kind: 'text-range';
  blockId: string;
  quote: string;
  occurrence: number;
  prefix?: string;
  suffix?: string;
}

export interface AnnotationBlockAnchor {
  kind: 'block';
  blockId: string;
}

export type AnnotationAnchor = AnnotationTextAnchor | AnnotationBlockAnchor;

interface BaseAnnotation {
  id: string;
  kind: AnnotationKind;
  anchor: AnnotationAnchor;
  createdAt: string;
  updatedAt: string;
}

export interface HighlightAnnotation extends BaseAnnotation {
  kind: 'highlight';
  color: 'yellow';
}

export interface CommentAnnotation extends BaseAnnotation {
  kind: 'comment';
  color: 'yellow';
  comment: string;
}

export interface DeletionAnnotation extends BaseAnnotation {
  kind: 'deletion';
  reason?: string;
}

export type DocumentAnnotation = HighlightAnnotation | CommentAnnotation | DeletionAnnotation;

export interface AnnotationDocument {
  schemaVersion: typeof MARKDECK_ANNOTATION_SCHEMA_VERSION;
  documentPath: string;
  sourceUpdatedAt?: string;
  annotations: DocumentAnnotation[];
}

export interface SelectionQuoteMatch {
  quote: string;
  occurrence: number;
  prefix: string;
  suffix: string;
}

export function createAnnotationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `annotation-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTimestamp() {
  return new Date().toISOString();
}

export function buildSelectionQuoteMatch(blockText: string, selectedText: string, selectionStart: number): SelectionQuoteMatch {
  const normalizedBlock = normalizeWhitespace(blockText);
  const normalizedSelected = normalizeWhitespace(selectedText);
  const normalizedStart = normalizedBlock.lastIndexOf(normalizedSelected, selectionStart);
  const safeStart = normalizedStart >= 0 ? normalizedStart : Math.max(0, selectionStart);
  const occurrence = countOccurrences(normalizedBlock.slice(0, safeStart), normalizedSelected);

  return {
    quote: normalizedSelected,
    occurrence,
    prefix: normalizedBlock.slice(Math.max(0, safeStart - 24), safeStart),
    suffix: normalizedBlock.slice(safeStart + normalizedSelected.length, safeStart + normalizedSelected.length + 24),
  };
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function countOccurrences(haystack: string, needle: string) {
  if (!needle) {
    return 0;
  }

  let count = 0;
  let fromIndex = 0;

  while (fromIndex >= 0) {
    const nextIndex = haystack.indexOf(needle, fromIndex);
    if (nextIndex === -1) {
      break;
    }

    count += 1;
    fromIndex = nextIndex + needle.length;
  }

  return count;
}

export function findQuotedTextRange(blockText: string, anchor: AnnotationTextAnchor) {
  const normalizedBlock = normalizeWhitespace(blockText);
  if (!anchor.quote) {
    return null;
  }

  let fromIndex = 0;
  let matchIndex = -1;

  for (let occurrence = 0; occurrence <= anchor.occurrence; occurrence += 1) {
    matchIndex = normalizedBlock.indexOf(anchor.quote, fromIndex);
    if (matchIndex === -1) {
      return null;
    }

    fromIndex = matchIndex + anchor.quote.length;
  }

  return {
    start: matchIndex,
    end: matchIndex + anchor.quote.length,
  };
}
