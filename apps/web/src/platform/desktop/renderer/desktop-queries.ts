'use client';

import { useQuery } from '@tanstack/react-query';

import {
  buildDesktopDocumentTree,
  chooseDesktopContentRoot as chooseDesktopContentRootFromApi,
  collectDesktopMarkdownRelativePaths,
  getDesktopContentRoot,
  listDesktopDirectory,
  readDesktopAsset,
  readDesktopMarkdownDocument,
  searchDesktopMarkdownDocuments,
} from '@/platform/desktop/renderer/desktop-api';
import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';

export const desktopQueryKeys = {
  contentRoot: ['desktop', 'content-root'] as const,
  directory: (relativePath: string) => ['desktop', 'directory', relativePath] as const,
  documentTree: (relativePath: string, depth: number) => ['desktop', 'document-tree', relativePath, depth] as const,
  document: (relativePath: string) => ['desktop', 'document', relativePath] as const,
  knownDocuments: ['desktop', 'known-documents'] as const,
  documentPage: (relativePath: string) => ['desktop', 'document-page', relativePath] as const,
  search: (query: string) => ['desktop', 'search', query] as const,
  asset: (relativePath: string) => ['desktop', 'asset', relativePath] as const,
};

export function useDesktopContentRootQuery(enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.contentRoot,
    queryFn: () => getDesktopContentRoot(),
    enabled: enabled && isDesktopRenderer(),
  });
}

export function useDesktopDirectoryQuery(relativePath: string, enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.directory(relativePath),
    queryFn: () => listDesktopDirectory(relativePath),
    enabled: enabled && isDesktopRenderer(),
  });
}

export function useDesktopDocumentTreeQuery(relativePath: string, depth = 1, enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.documentTree(relativePath, depth),
    queryFn: () => buildDesktopDocumentTree(relativePath, depth),
    enabled: enabled && isDesktopRenderer(),
  });
}

export function useDesktopDocumentPageQuery(relativePath: string, enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.documentPage(relativePath),
    queryFn: async () => {
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
    },
    enabled: enabled && isDesktopRenderer() && Boolean(relativePath),
  });
}

export function useDesktopSearchQuery(query: string, enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.search(query),
    queryFn: () => searchDesktopMarkdownDocuments(query),
    enabled: enabled && isDesktopRenderer() && Boolean(query.trim()),
  });
}

export function useDesktopAssetQuery(relativePath: string, enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.asset(relativePath),
    queryFn: () => readDesktopAsset(relativePath),
    enabled: enabled && isDesktopRenderer() && Boolean(relativePath),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}

export async function chooseDesktopContentRoot() {
  return chooseDesktopContentRootFromApi();
}
