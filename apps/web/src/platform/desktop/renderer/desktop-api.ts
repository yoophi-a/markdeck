import type { BrowserEntry, DocumentTreeNode, MarkdownDocument } from '@/shared/lib/content-types';

function getDesktopApi() {
  return window.markdeckDesktop;
}

export function isDesktopRenderer() {
  return typeof window !== 'undefined' && Boolean(getDesktopApi());
}

export function getDesktopContentRoot() {
  return getDesktopApi()?.getContentRoot() ?? Promise.resolve(null);
}

export function chooseDesktopContentRoot() {
  return getDesktopApi()?.chooseContentRoot() ?? Promise.resolve(null);
}

export function listDesktopDirectory(relativePath = ''): Promise<BrowserEntry[]> {
  return getDesktopApi()?.listDirectory(relativePath) ?? Promise.resolve([]);
}

export function buildDesktopDocumentTree(relativePath = '', depth = 2): Promise<DocumentTreeNode[]> {
  return getDesktopApi()?.buildDocumentTree(relativePath, depth) ?? Promise.resolve([]);
}

export function readDesktopMarkdownDocument(relativePath: string): Promise<MarkdownDocument | null> {
  return getDesktopApi()?.readMarkdownDocument(relativePath) ?? Promise.resolve(null);
}

export function collectDesktopMarkdownRelativePaths(): Promise<string[]> {
  return getDesktopApi()?.collectMarkdownRelativePaths() ?? Promise.resolve([]);
}
