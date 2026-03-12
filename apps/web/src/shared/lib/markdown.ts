import path from 'node:path';

import { toDocHref } from '@/shared/lib/routes';

export interface HeadingItem {
  depth: 1 | 2 | 3;
  text: string;
  id: string;
}

export interface WikiLinkResolver {
  (rawTarget: string): string | null;
}

interface ParsedWikiLinkTarget {
  documentPath: string;
  section: string;
}

export function extractCodeText(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child) => extractCodeText(child)).join('');
  }

  if (children && typeof children === 'object' && 'props' in children) {
    const props = (children as { props?: { children?: React.ReactNode } }).props;
    return extractCodeText(props?.children ?? '');
  }

  return '';
}

export function createSlugger() {
  const counts = new Map<string, number>();

  return (value: string) => {
    const base = slugify(value);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

export function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}\-_]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'section';
}

export function extractHeadings(markdown: string): HeadingItem[] {
  const createHeadingId = createSlugger();
  const headings: HeadingItem[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!match) {
      continue;
    }

    const depth = match[1].length as 1 | 2 | 3;
    const text = stripMarkdownInline(match[2].trim());

    if (!text) {
      continue;
    }

    headings.push({
      depth,
      text,
      id: createHeadingId(text),
    });
  }

  return headings;
}

export function preprocessWikiLinks(content: string, resolveWikiLink: WikiLinkResolver) {
  return content.replace(/\[\[([^\]\n]+)\]\]/g, (fullMatch, rawTarget) => {
    const [targetPart, labelPart] = String(rawTarget)
      .split('|')
      .map((value) => value.trim());

    if (!targetPart) {
      return fullMatch;
    }

    const resolvedHref = resolveWikiLink(targetPart);
    if (!resolvedHref) {
      return labelPart || formatWikiLinkLabel(targetPart);
    }

    const linkLabel = labelPart || formatWikiLinkLabel(targetPart);
    return `[${linkLabel}](${resolvedHref})`;
  });
}

export function resolveWikiLinkPath(currentRelativePath: string, rawTarget: string, knownDocuments: string[]) {
  const { documentPath } = parseWikiLinkTarget(rawTarget);
  const normalizedTarget = documentPath.trim().replace(/^\/+/, '').replace(/\\/g, '/');

  if (!normalizedTarget) {
    return currentRelativePath;
  }

  const currentDirectory = path.posix.dirname(`/${currentRelativePath}`);
  const candidateBase = path.posix.normalize(path.posix.join(currentDirectory, normalizedTarget)).replace(/^\//, '');
  const candidates = new Set<string>();

  candidates.add(candidateBase);
  if (!candidateBase.endsWith('.md')) {
    candidates.add(`${candidateBase}.md`);
    candidates.add(path.posix.join(candidateBase, 'README.md'));
    candidates.add(path.posix.join(candidateBase, 'index.md'));
  }

  const normalizedKnown = new Set(knownDocuments.map((document) => document.replace(/\\/g, '/')));

  for (const candidate of candidates) {
    if (normalizedKnown.has(candidate)) {
      return candidate;
    }
  }

  const targetName = path.posix.basename(candidateBase, '.md').toLowerCase();
  const fuzzyMatches = knownDocuments.filter((document) => path.posix.basename(document, '.md').toLowerCase() === targetName);

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  return null;
}

export function resolveWikiLinkHref(currentRelativePath: string, rawTarget: string, knownDocuments: string[]) {
  const { section } = parseWikiLinkTarget(rawTarget);
  const relativePath = resolveWikiLinkPath(currentRelativePath, rawTarget, knownDocuments);

  if (!relativePath) {
    return null;
  }

  const sectionAnchor = section ? `#${slugify(section)}` : '';
  return `${toDocHref(relativePath)}${sectionAnchor}`;
}

function parseWikiLinkTarget(rawTarget: string): ParsedWikiLinkTarget {
  const [documentPath = '', ...sectionParts] = rawTarget.trim().split('#');

  return {
    documentPath: documentPath.trim(),
    section: sectionParts.join('#').trim(),
  };
}

function formatWikiLinkLabel(rawTarget: string) {
  const { documentPath, section } = parseWikiLinkTarget(rawTarget);

  if (documentPath) {
    return path.posix.basename(documentPath, '.md');
  }

  if (section) {
    return section;
  }

  return rawTarget;
}

function stripMarkdownInline(value: string) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}
