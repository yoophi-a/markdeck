import type { DesktopApiResult } from '@/shared/lib/desktop-contract';

export {};

declare global {
  interface Window {
    markdeckDesktop?: {
      getContentRoot: () => Promise<DesktopApiResult<string | null>>;
      chooseContentRoot: () => Promise<DesktopApiResult<string | null>>;
      listDirectory: (relativePath?: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').BrowserEntry[]>>;
      buildDocumentTree: (relativePath?: string, depth?: number) => Promise<DesktopApiResult<import('@/shared/lib/content-types').DocumentTreeNode[]>>;
      readMarkdownDocument: (relativePath: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').MarkdownDocument>>;
      collectMarkdownRelativePaths: () => Promise<DesktopApiResult<string[]>>;
      searchMarkdownDocuments: (query: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').SearchResult[]>>;
      readAsset: (relativePath: string) => Promise<DesktopApiResult<import('@/shared/lib/content-types').AssetPayload | null>>;
    };
  }
}
