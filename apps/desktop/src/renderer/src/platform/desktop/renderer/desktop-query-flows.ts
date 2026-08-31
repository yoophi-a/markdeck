import type { DocumentTreeNode, MarkdownDocument } from '@/shared/lib/content-types';

export interface DesktopDocumentPageData {
  document: MarkdownDocument | null;
  knownDocuments: string[];
  sidebarTree: DocumentTreeNode[];
}

export interface DesktopDocumentPageServices {
  readMarkdownDocument: (relativePath: string) => Promise<MarkdownDocument | null>;
  collectMarkdownRelativePaths: () => Promise<string[]>;
  buildDocumentTree: (relativePath: string, depth: number) => Promise<DocumentTreeNode[]>;
}

export function getDesktopDocumentDirectoryPath(relativePath: string) {
  return relativePath.split('/').slice(0, -1).join('/');
}

export async function loadDesktopDocumentPageData(
  relativePath: string,
  services: DesktopDocumentPageServices
): Promise<DesktopDocumentPageData> {
  const directoryPath = getDesktopDocumentDirectoryPath(relativePath);
  const [document, knownDocuments, sidebarTree] = await Promise.all([
    services.readMarkdownDocument(relativePath),
    services.collectMarkdownRelativePaths(),
    services.buildDocumentTree(directoryPath, 1),
  ]);

  return {
    document,
    knownDocuments,
    sidebarTree,
  };
}
