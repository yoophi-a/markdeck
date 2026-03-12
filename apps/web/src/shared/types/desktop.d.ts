export {};

declare global {
  interface Window {
    markdeckDesktop?: {
      getContentRoot: () => Promise<string | null>;
      chooseContentRoot: () => Promise<string | null>;
      listDirectory: (relativePath?: string) => Promise<import('@/shared/lib/content-types').BrowserEntry[]>;
      buildDocumentTree: (relativePath?: string, depth?: number) => Promise<import('@/shared/lib/content-types').DocumentTreeNode[]>;
      readMarkdownDocument: (relativePath: string) => Promise<import('@/shared/lib/content-types').MarkdownDocument>;
      collectMarkdownRelativePaths: () => Promise<string[]>;
      searchMarkdownDocuments: (query: string) => Promise<import('@/shared/lib/content-types').SearchResult[]>;
      readAsset: (relativePath: string) => Promise<import('@/shared/lib/content-types').AssetPayload | null>;
    };
  }
}
