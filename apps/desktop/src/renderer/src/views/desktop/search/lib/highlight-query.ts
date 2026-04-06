export interface HighlightSegment {
  text: string;
  matched: boolean;
}

export function buildHighlightSegments(text: string, query: string): HighlightSegment[] {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [{ text, matched: false }];
  }

  return text.split(new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'gi')).map((segment) => ({
    text: segment,
    matched: segment.toLowerCase() === normalizedQuery.toLowerCase(),
  }));
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
