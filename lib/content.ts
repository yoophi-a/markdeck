import fs from 'node:fs/promises';
import path from 'node:path';

export type EntryType = 'directory' | 'markdown' | 'file';

export interface BrowserEntry {
  name: string;
  relativePath: string;
  type: EntryType;
}

export interface MarkdownDocument {
  absolutePath: string;
  relativePath: string;
  content: string;
  title: string;
}

const DEFAULT_ROOT = path.resolve(process.cwd(), '..', '..');
const CONTENT_ROOT = path.resolve(process.env.MARKDECK_CONTENT_ROOT ?? DEFAULT_ROOT);
const DEFAULT_IGNORE_PATTERNS = ['.git', 'node_modules'];
const IGNORE_PATTERNS = parseIgnorePatterns(process.env.MARKDECK_IGNORE_PATTERNS);

function parseIgnorePatterns(rawValue?: string) {
  const customPatterns = rawValue
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return customPatterns && customPatterns.length > 0 ? customPatterns : DEFAULT_IGNORE_PATTERNS;
}

function normalizeSegments(segments: string[] = []): string[] {
  return segments.filter(Boolean);
}

function assertSafePath(relativePath: string) {
  const resolvedPath = path.resolve(CONTENT_ROOT, relativePath);
  const relativeToRoot = path.relative(CONTENT_ROOT, resolvedPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Unsafe path outside of content root');
  }

  return resolvedPath;
}

function shouldIgnoreEntry(entryName: string) {
  return entryName.startsWith('.') || IGNORE_PATTERNS.some((pattern) => matchesPattern(entryName, pattern));
}

function matchesPattern(entryName: string, pattern: string) {
  if (pattern === entryName) {
    return true;
  }

  if (pattern.startsWith('*.')) {
    return entryName.toLowerCase().endsWith(pattern.slice(1).toLowerCase());
  }

  return false;
}

export function getContentRoot() {
  return CONTENT_ROOT;
}

export function getIgnorePatterns() {
  return IGNORE_PATTERNS;
}

export async function listDirectory(segments: string[] = []): Promise<BrowserEntry[]> {
  const relativePath = normalizeSegments(segments).join('/');
  const absolutePath = assertSafePath(relativePath);
  const dirents = await fs.readdir(absolutePath, { withFileTypes: true });

  return dirents
    .filter((entry) => !shouldIgnoreEntry(entry.name))
    .map<BrowserEntry>((entry) => {
      const entryRelativePath = normalizeSegments([...segments, entry.name]).join('/');

      if (entry.isDirectory()) {
        return { name: entry.name, relativePath: entryRelativePath, type: 'directory' };
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        return { name: entry.name, relativePath: entryRelativePath, type: 'markdown' };
      }

      return { name: entry.name, relativePath: entryRelativePath, type: 'file' };
    })
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      if (a.type === 'directory') return -1;
      if (b.type === 'directory') return 1;
      if (a.type === 'markdown') return -1;
      if (b.type === 'markdown') return 1;
      return a.name.localeCompare(b.name);
    });
}

export async function readMarkdownDocument(segments: string[]): Promise<MarkdownDocument> {
  const relativePath = normalizeSegments(segments).join('/');

  if (!relativePath.toLowerCase().endsWith('.md')) {
    throw new Error('Only markdown files are supported');
  }

  const absolutePath = assertSafePath(relativePath);
  const content = await fs.readFile(absolutePath, 'utf8');
  const title = extractTitle(relativePath, content);

  return {
    absolutePath,
    relativePath,
    content,
    title,
  };
}

function extractTitle(relativePath: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(relativePath, '.md');
}

export function toDocHref(relativePath: string) {
  return `/docs/${encodePath(relativePath)}`;
}

export function toBrowseHref(relativePath = '') {
  return relativePath ? `/browse/${encodePath(relativePath)}` : '/browse';
}

function encodePath(relativePath: string) {
  return relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function resolveMarkdownLink(currentRelativePath: string, href: string) {
  if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) {
    return href;
  }

  const currentDirectory = path.posix.dirname(`/${currentRelativePath}`);
  const resolvedPath = path.posix.normalize(path.posix.join(currentDirectory, href));
  const cleanPath = resolvedPath.replace(/^\//, '');

  if (href.endsWith('.md') || cleanPath.endsWith('.md')) {
    return toDocHref(cleanPath);
  }

  return toBrowseHref(cleanPath);
}
