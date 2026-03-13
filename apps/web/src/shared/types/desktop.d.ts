import type { DesktopApiResult } from '@/shared/lib/desktop-contract';
import type { DesktopCommandEvent, DesktopContentInvalidationEvent, DesktopContentRootChangedEvent } from '@/platform/desktop/renderer/desktop-api';

export {};

declare global {
  interface Window {
    markdeckDesktop?: {
      getContentRoot: () => Promise<DesktopApiResult<string | null>>;
      getRecentContentRoots: () => Promise<DesktopApiResult<string[]>>;
      chooseContentRoot: () => Promise<DesktopApiResult<string | null>>;
      openRecentContentRoot: (contentRoot: string) => Promise<DesktopApiResult<string | null>>;
      listDirectory: (relativePath?: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').BrowserEntry[]>>;
      buildDocumentTree: (relativePath?: string, depth?: number) => Promise<DesktopApiResult<import('@/shared/lib/content-types').DocumentTreeNode[]>>;
      readMarkdownDocument: (relativePath: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').MarkdownDocument>>;
      collectMarkdownRelativePaths: () => Promise<DesktopApiResult<string[]>>;
      searchMarkdownDocuments: (query: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').SearchResult[]>>;
      readAsset: (relativePath: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').AssetPayload | null>>;
      executeCommand: (command: string, payload?: unknown) => Promise<DesktopApiResult<unknown>>;
      onContentInvalidated: (listener: (payload: DesktopContentInvalidationEvent) => void) => () => void;
      onContentRootChanged: (listener: (payload: DesktopContentRootChangedEvent) => void) => () => void;
      onCommand: (listener: (payload: DesktopCommandEvent) => void) => () => void;
    };
  }
}
