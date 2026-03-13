'use client';

const LAST_DOCUMENT_STORAGE_KEY = 'markdeck:last-document';
const LAST_BROWSE_STORAGE_KEY = 'markdeck:last-browse';
const TREE_STATE_STORAGE_KEY = 'markdeck:tree-state';

export interface LastDocumentState {
  contentRootKey: string;
  relativePath: string;
  title: string;
  viewedAt: string;
}

export interface LastBrowseState {
  contentRootKey: string;
  relativePath: string;
  viewedAt: string;
}

interface PersistedTreeState {
  contentRootKey: string;
  expandedPaths: string[];
}

export function readLastDocumentState(contentRootKey: string) {
  return readScopedState<LastDocumentState>(LAST_DOCUMENT_STORAGE_KEY, contentRootKey, ['relativePath', 'title', 'viewedAt']);
}

export function writeLastDocumentState(state: LastDocumentState) {
  writeState(LAST_DOCUMENT_STORAGE_KEY, state);
}

export function readLastBrowseState(contentRootKey: string) {
  return readScopedState<LastBrowseState>(LAST_BROWSE_STORAGE_KEY, contentRootKey, ['relativePath', 'viewedAt']);
}

export function writeLastBrowseState(state: LastBrowseState) {
  writeState(LAST_BROWSE_STORAGE_KEY, state);
}

export function readTreeState(contentRootKey: string) {
  const state = readScopedState<PersistedTreeState>(TREE_STATE_STORAGE_KEY, contentRootKey, ['expandedPaths']);
  if (!state || !Array.isArray(state.expandedPaths)) {
    return [];
  }

  return state.expandedPaths.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function writeTreeState(contentRootKey: string, expandedPaths: string[]) {
  writeState(TREE_STATE_STORAGE_KEY, {
    contentRootKey,
    expandedPaths,
  } satisfies PersistedTreeState);
}

function readScopedState<T extends { contentRootKey: string }>(storageKey: string, contentRootKey: string, requiredKeys: string[]) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as T | null;
    if (!parsed || parsed.contentRootKey !== contentRootKey) {
      return null;
    }

    const hasRequiredKeys = requiredKeys.every((key) => {
      const value = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return true;
      }

      return typeof value === 'string' && value.length > 0;
    });

    return hasRequiredKeys ? parsed : null;
  } catch {
    return null;
  }
}

function writeState(storageKey: string, state: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}
