import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import type { BrowserEntry, DocumentTreeNode, MarkdownDocument, SearchResult } from '@/shared/lib/content-types';

const DEFAULT_ROOT = process.cwd();
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

function sortBrowserEntries(a: BrowserEntry, b: BrowserEntry) {
  if (a.type === b.type) return a.name.localeCompare(b.name);
  if (a.type === 'directory') return -1;
  if (b.type === 'directory') return 1;
  if (a.type === 'markdown') return -1;
  if (b.type === 'markdown') return 1;
  return a.name.localeCompare(b.name);
}

function sortTreeNodes(a: DocumentTreeNode, b: DocumentTreeNode) {
  if (a.type === b.type) {
    return a.name.localeCompare(b.name);
  }

  if (a.type === 'directory') return -1;
  return 1;
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

  const entries = await Promise.all(
    dirents
      .filter((entry) => !shouldIgnoreEntry(entry.name))
      .map(async (entry) => {
        const entryRelativePath = normalizeSegments([...segments, entry.name]).join('/');
        const entryAbsolutePath = path.join(absolutePath, entry.name);
        const stats = await fs.stat(entryAbsolutePath);

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'directory' as const,
            updatedAt: stats.mtime.toISOString(),
          };
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'markdown' as const,
            size: stats.size,
            updatedAt: stats.mtime.toISOString(),
          };
        }

        return {
          name: entry.name,
          relativePath: entryRelativePath,
          type: 'file' as const,
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
        };
      })
  );

  return entries.sort(sortBrowserEntries);
}

export async function buildDocumentTree(segments: string[] = [], depth = 2): Promise<DocumentTreeNode[]> {
  const relativePath = normalizeSegments(segments).join('/');
  const absolutePath = assertSafePath(relativePath);
  const dirents = await fs.readdir(absolutePath, { withFileTypes: true });

  const nodes = await Promise.all<DocumentTreeNode | null>(
    dirents
      .filter((entry) => !shouldIgnoreEntry(entry.name))
      .map(async (entry): Promise<DocumentTreeNode | null> => {
        const entryRelativePath = normalizeSegments([...segments, entry.name]).join('/');

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'directory',
            children: depth > 1 ? await buildDocumentTree([...segments, entry.name], depth - 1) : undefined,
          };
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'markdown',
          };
        }

        return null;
      })
  );

  return nodes.filter((node): node is DocumentTreeNode => node !== null).sort(sortTreeNodes);
}

export async function readMarkdownDocument(segments: string[]): Promise<MarkdownDocument> {
  const relativePath = normalizeSegments(segments).join('/');

  if (!relativePath.toLowerCase().endsWith('.md')) {
    throw new Error('Only markdown files are supported');
  }

  const absolutePath = assertSafePath(relativePath);
  const [content, stats] = await Promise.all([fs.readFile(absolutePath, 'utf8'), fs.stat(absolutePath)]);
  const title = extractTitle(relativePath, content);

  return {
    absolutePath,
    relativePath,
    content,
    title,
    size: stats.size,
    updatedAt: stats.mtime.toISOString(),
  };
}

export async function collectMarkdownRelativePaths(): Promise<string[]> {
  const markdownFiles = await collectMarkdownFiles(CONTENT_ROOT);
  return markdownFiles
    .map((filePath) => path.relative(CONTENT_ROOT, filePath).split(path.sep).join('/'))
    .sort((a, b) => a.localeCompare(b));
}

export async function searchMarkdownDocuments(query: string): Promise<SearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const markdownFiles = await collectMarkdownFiles(CONTENT_ROOT);
  const results = await Promise.all(
    markdownFiles.map(async (filePath) => {
      const relativePath = path.relative(CONTENT_ROOT, filePath).split(path.sep).join('/');
      const [content, stats] = await Promise.all([fs.readFile(filePath, 'utf8'), fs.stat(filePath)]);
      const title = extractTitle(relativePath, content);
      const haystack = `${relativePath}\n${title}\n${content}`.toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return null;
      }

      return {
        relativePath,
        title,
        snippet: buildSnippet(content, normalizedQuery),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
      } satisfies SearchResult;
    })
  );

  return results
    .filter((value): value is SearchResult => Boolean(value))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function collectMarkdownFiles(directoryPath: string): Promise<string[]> {
  const dirents = await fs.readdir(directoryPath, { withFileTypes: true });
  const nestedResults = await Promise.all(
    dirents
      .filter((entry) => !shouldIgnoreEntry(entry.name))
      .map(async (entry) => {
        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          return collectMarkdownFiles(entryPath);
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          return [entryPath];
        }

        return [];
      })
  );

  return nestedResults.flat();
}

function buildSnippet(content: string, normalizedQuery: string) {
  const compact = content.replace(/\s+/g, ' ').trim();
  const index = compact.toLowerCase().indexOf(normalizedQuery);

  if (index === -1) {
    return compact.slice(0, 180);
  }

  const start = Math.max(0, index - 60);
  const end = Math.min(compact.length, index + normalizedQuery.length + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < compact.length ? '…' : '';

  return `${prefix}${compact.slice(start, end)}${suffix}`;
}

function extractTitle(relativePath: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(relativePath, '.md');
}

