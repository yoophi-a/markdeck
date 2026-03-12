import {
  buildDesktopDocumentTree,
  collectDesktopMarkdownRelativePaths,
  listDesktopDirectory,
  readDesktopAsset,
  readDesktopMarkdownDocument,
  searchDesktopMarkdownDocuments,
} from '@/platform/desktop/renderer/desktop-api';

export function getDesktopBrowserEntries(relativePath = '') {
  return listDesktopDirectory(relativePath);
}

export async function getDesktopDocumentPageData(relativePath: string) {
  const directoryPath = relativePath.split('/').slice(0, -1).join('/');
  const [document, knownDocuments, sidebarTree] = await Promise.all([
    readDesktopMarkdownDocument(relativePath),
    collectDesktopMarkdownRelativePaths(),
    buildDesktopDocumentTree(directoryPath, 1),
  ]);

  return {
    document,
    knownDocuments,
    sidebarTree,
  };
}

export function searchDesktopDocuments(query: string) {
  return searchDesktopMarkdownDocuments(query);
}

export function getDesktopAsset(relativePath: string) {
  return readDesktopAsset(relativePath);
}
