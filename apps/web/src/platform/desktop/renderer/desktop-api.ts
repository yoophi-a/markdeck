import type { AssetPayload, BrowserEntry, DocumentTreeNode, MarkdownDocument, SearchResult } from '@/shared/lib/content-types';
import { DesktopApiError, type DesktopApiResult } from '@/shared/lib/desktop-contract';

function getDesktopApi() {
  return window.markdeckDesktop;
}

async function unwrapDesktopResult<T>(promise: Promise<DesktopApiResult<T>> | undefined, fallbackValue: T, fallbackMessage = 'Desktop IPC를 사용할 수 없습니다.') {
  if (!promise) {
    throw new DesktopApiError({ code: 'IPC_UNAVAILABLE', message: fallbackMessage });
  }

  const result = await promise;

  if (!result.ok) {
    throw new DesktopApiError(result.error);
  }

  return result.data ?? fallbackValue;
}

export function isDesktopRenderer() {
  return typeof window !== 'undefined' && Boolean(getDesktopApi());
}

export function getDesktopContentRoot() {
  return unwrapDesktopResult(getDesktopApi()?.getContentRoot(), null);
}

export function chooseDesktopContentRoot() {
  return unwrapDesktopResult(getDesktopApi()?.chooseContentRoot(), null);
}

export function listDesktopDirectory(relativePath = ''): Promise<BrowserEntry[]> {
  return unwrapDesktopResult(getDesktopApi()?.listDirectory(relativePath), []);
}

export function buildDesktopDocumentTree(relativePath = '', depth = 2): Promise<DocumentTreeNode[]> {
  return unwrapDesktopResult(getDesktopApi()?.buildDocumentTree(relativePath, depth), []);
}

export function readDesktopMarkdownDocument(relativePath: string): Promise<MarkdownDocument | null> {
  return unwrapDesktopResult(getDesktopApi()?.readMarkdownDocument(relativePath), null);
}

export function collectDesktopMarkdownRelativePaths(): Promise<string[]> {
  return unwrapDesktopResult(getDesktopApi()?.collectMarkdownRelativePaths(), []);
}

export function searchDesktopMarkdownDocuments(query: string): Promise<SearchResult[]> {
  return unwrapDesktopResult(getDesktopApi()?.searchMarkdownDocuments(query), []);
}

export function readDesktopAsset(relativePath: string): Promise<AssetPayload | null> {
  return unwrapDesktopResult(getDesktopApi()?.readAsset(relativePath), null);
}
