export interface DocumentSummary {
  headingCount: number;
  linkCount: number;
  imageCount: number;
  readingMinutes: number;
}

export function summarizeDocument(content: string, headingCount: number): DocumentSummary {
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
