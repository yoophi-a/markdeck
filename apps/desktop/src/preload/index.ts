import { contextBridge, ipcRenderer } from 'electron';

function invoke<T>(channel: string, ...args: unknown[]) {
  return ipcRenderer.invoke(channel, ...args);
}

function subscribe<T>(channel: string, listener: (payload: T) => void) {
  const wrappedListener = (_event: Electron.IpcRendererEvent, payload: T) => {
    listener(payload);
  };

  ipcRenderer.on(channel, wrappedListener);
  return () => {
    ipcRenderer.removeListener(channel, wrappedListener);
  };
}

contextBridge.exposeInMainWorld('markdeckDesktop', {
  getContentRoot: () => invoke('markdeck:get-content-root'),
  getRecentContentRoots: () => invoke('markdeck:get-recent-content-roots'),
  chooseContentRoot: () => invoke('markdeck:choose-content-root'),
  openRecentContentRoot: (contentRoot: string) => invoke('markdeck:open-recent-content-root', contentRoot),
  listDirectory: (relativePath = '') => invoke('markdeck:list-directory', relativePath),
  buildDocumentTree: (relativePath = '', depth = 2) => invoke('markdeck:build-document-tree', relativePath, depth),
  readMarkdownDocument: (relativePath: string) => invoke('markdeck:read-markdown-document', relativePath),
  collectMarkdownRelativePaths: () => invoke('markdeck:collect-markdown-relative-paths'),
  searchMarkdownDocuments: (query: string) => invoke('markdeck:search-markdown-documents', query),
  getSearchStatus: () => invoke('markdeck:get-search-status'),
  readAsset: (relativePath: string) => invoke('markdeck:read-asset', relativePath),
  executeCommand: (command: string, payload: unknown = null) => invoke('markdeck:execute-command', command, payload),
  onContentInvalidated: (listener: (payload: unknown) => void) => subscribe('markdeck:content-invalidated', listener),
  onContentRootChanged: (listener: (payload: unknown) => void) => subscribe('markdeck:content-root-changed', listener),
  onCommand: (listener: (payload: unknown) => void) => subscribe('markdeck:command', listener),
});
