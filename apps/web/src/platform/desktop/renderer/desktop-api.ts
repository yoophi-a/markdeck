import type { AssetPayload, BrowserEntry, DocumentTreeNode, MarkdownDocument, SearchResult } from '@/shared/lib/content-types';
import { DesktopApiError, type DesktopApiResult } from '@/shared/lib/desktop-contract';

export interface DesktopContentInvalidationEvent {
  relativePath: string | null;
  reason: string;
  contentRoot: string | null;
  changedAt: string;
}

export interface DesktopContentRootChangedEvent {
  contentRoot: string | null;
  recentContentRoots: string[];
}

export interface DesktopCommandEvent {
  command: string;
  payload?: unknown;
  issuedAt: string;
}

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

export function getDesktopRecentContentRoots() {
  return unwrapDesktopResult(getDesktopApi()?.getRecentContentRoots(), [] as string[]);
}

export function chooseDesktopContentRoot() {
  return unwrapDesktopResult(getDesktopApi()?.chooseContentRoot(), null);
}

export function openDesktopRecentContentRoot(contentRoot: string) {
  return unwrapDesktopResult(getDesktopApi()?.openRecentContentRoot(contentRoot), null);
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

export function executeDesktopCommand(command: string, payload: unknown = null) {
  return unwrapDesktopResult(getDesktopApi()?.executeCommand(command, payload), true);
}

function subscribeDesktopEvent<T>(subscribe: ((listener: (payload: T) => void) => (() => void) | void) | undefined, listener: (payload: T) => void) {
  if (!subscribe) {
    return () => {};
  }

  return subscribe(listener) ?? (() => {});
}

export function onDesktopContentInvalidated(listener: (payload: DesktopContentInvalidationEvent) => void) {
  return subscribeDesktopEvent(getDesktopApi()?.onContentInvalidated, listener);
}

export function onDesktopContentRootChanged(listener: (payload: DesktopContentRootChangedEvent) => void) {
  return subscribeDesktopEvent(getDesktopApi()?.onContentRootChanged, listener);
}

export function onDesktopCommand(listener: (payload: DesktopCommandEvent) => void) {
  return subscribeDesktopEvent(getDesktopApi()?.onCommand, listener);
}
