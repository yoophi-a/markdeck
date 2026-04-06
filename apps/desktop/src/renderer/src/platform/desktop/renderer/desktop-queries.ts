'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  buildDesktopDocumentTree,
  chooseDesktopContentRoot as chooseDesktopContentRootFromApi,
  collectDesktopMarkdownRelativePaths,
  getDesktopContentRoot,
  getDesktopRecentContentRoots,
  getDesktopSearchStatus,
  listDesktopDirectory,
  openDesktopRecentContentRoot,
  readDesktopAsset,
  readDesktopMarkdownDocument,
  searchDesktopMarkdownDocuments,
} from '@/platform/desktop/renderer/desktop-api';
import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';

export const desktopQueryKeys = {
  contentRoot: ['desktop', 'content-root'] as const,
  recentContentRoots: ['desktop', 'recent-content-roots'] as const,
  directory: (relativePath: string) => ['desktop', 'directory', relativePath] as const,
  documentTree: (relativePath: string, depth: number) => ['desktop', 'document-tree', relativePath, depth] as const,
  document: (relativePath: string) => ['desktop', 'document', relativePath] as const,
  knownDocuments: ['desktop', 'known-documents'] as const,
  documentPage: (relativePath: string) => ['desktop', 'document-page', relativePath] as const,
  search: (query: string) => ['desktop', 'search', query] as const,
  searchStatus: ['desktop', 'search-status'] as const,
  asset: (relativePath: string) => ['desktop', 'asset', relativePath] as const,
  recentDocuments: ['desktop', 'recent-documents'] as const,
  pinnedDocuments: ['desktop', 'pinned-documents'] as const,
};

export interface RecentDocumentItem {
  relativePath: string;
  title: string;
  viewedAt: string;
}

export interface PinnedDocumentItem {
  relativePath: string;
  title: string;
  pinnedAt: string;
}

const RECENT_DOCUMENTS_STORAGE_KEY = 'markdeck:recent-documents';
const PINNED_DOCUMENTS_STORAGE_KEY = 'markdeck:pinned-documents';

export function useDesktopContentRootQuery(enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.contentRoot,
    queryFn: () => getDesktopContentRoot(),
    enabled: enabled && isDesktopRenderer(),
  });
}

export function useDesktopRecentContentRootsQuery(enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.recentContentRoots,
    queryFn: () => getDesktopRecentContentRoots(),
    enabled: enabled && isDesktopRenderer(),
    staleTime: Infinity,
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
    staleTime: 60_000,
  });
}

export function useDesktopSearchStatusQuery(enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.searchStatus,
    queryFn: () => getDesktopSearchStatus(),
    enabled: enabled && isDesktopRenderer(),
    staleTime: 30_000,
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

function readPersistedItems<T extends object>(storageKey: string, requiredKeys: Array<keyof T & string>) {
  if (typeof window === 'undefined') {
    return [] as T[];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [] as T[];
    }

    const parsed = JSON.parse(rawValue) as T[];
    if (!Array.isArray(parsed)) {
      return [] as T[];
    }

    return parsed.filter(
      (item): item is T =>
        Boolean(item) &&
        requiredKeys.every((key) => {
          const value = item[key];
          return typeof value === 'string' && value.length > 0;
        })
    );
  } catch {
    return [] as T[];
  }
}

function writePersistedItems<T>(storageKey: string, items: T[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

export function invalidateDesktopContentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: desktopQueryKeys.contentRoot }),
    queryClient.invalidateQueries({ queryKey: desktopQueryKeys.recentContentRoots }),
    queryClient.invalidateQueries({ queryKey: ['desktop', 'directory'] }),
    queryClient.invalidateQueries({ queryKey: ['desktop', 'document-tree'] }),
    queryClient.invalidateQueries({ queryKey: ['desktop', 'document-page'] }),
    queryClient.invalidateQueries({ queryKey: desktopQueryKeys.knownDocuments }),
    queryClient.invalidateQueries({ queryKey: ['desktop', 'search'] }),
    queryClient.invalidateQueries({ queryKey: desktopQueryKeys.searchStatus }),
    queryClient.invalidateQueries({ queryKey: ['desktop', 'asset'] }),
  ]);
}

export function useRecentDocumentsQuery(enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.recentDocuments,
    queryFn: async () =>
      readPersistedItems<RecentDocumentItem>(RECENT_DOCUMENTS_STORAGE_KEY, ['relativePath', 'title', 'viewedAt']).sort(
        (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
      ),
    enabled,
    staleTime: Infinity,
  });
}

export function usePinnedDocumentsQuery(enabled = true) {
  return useQuery({
    queryKey: desktopQueryKeys.pinnedDocuments,
    queryFn: async () =>
      readPersistedItems<PinnedDocumentItem>(PINNED_DOCUMENTS_STORAGE_KEY, ['relativePath', 'title', 'pinnedAt']).sort(
        (a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()
      ),
    enabled,
    staleTime: Infinity,
  });
}

export function useRecordRecentDocumentMutation(limit = 12) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Pick<RecentDocumentItem, 'relativePath' | 'title'>) => {
      const nextItems = [
        {
          ...document,
          viewedAt: new Date().toISOString(),
        },
        ...readPersistedItems<RecentDocumentItem>(RECENT_DOCUMENTS_STORAGE_KEY, ['relativePath', 'title', 'viewedAt']).filter(
          (item) => item.relativePath !== document.relativePath
        ),
      ].slice(0, limit);

      writePersistedItems(RECENT_DOCUMENTS_STORAGE_KEY, nextItems);
      return nextItems;
    },
    onSuccess: (items) => {
      queryClient.setQueryData(desktopQueryKeys.recentDocuments, items);
    },
  });
}

export function useTogglePinnedDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Pick<PinnedDocumentItem, 'relativePath' | 'title'>) => {
      const items = readPersistedItems<PinnedDocumentItem>(PINNED_DOCUMENTS_STORAGE_KEY, ['relativePath', 'title', 'pinnedAt']);
      const isPinned = items.some((item) => item.relativePath === document.relativePath);
      const nextItems = isPinned
        ? items.filter((item) => item.relativePath !== document.relativePath)
        : [
            {
              ...document,
              pinnedAt: new Date().toISOString(),
            },
            ...items.filter((item) => item.relativePath !== document.relativePath),
          ];

      writePersistedItems(PINNED_DOCUMENTS_STORAGE_KEY, nextItems);
      return nextItems.sort((a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime());
    },
    onSuccess: (items) => {
      queryClient.setQueryData(desktopQueryKeys.pinnedDocuments, items);
    },
  });
}

export function useChooseDesktopContentRootMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => chooseDesktopContentRootFromApi(),
    onSuccess: async (nextRoot) => {
      queryClient.setQueryData(desktopQueryKeys.contentRoot, nextRoot);
      await invalidateDesktopContentQueries(queryClient);
    },
  });
}

export function useOpenDesktopRecentContentRootMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentRoot: string) => openDesktopRecentContentRoot(contentRoot),
    onSuccess: async (nextRoot) => {
      queryClient.setQueryData(desktopQueryKeys.contentRoot, nextRoot);
      await invalidateDesktopContentQueries(queryClient);
    },
  });
}
