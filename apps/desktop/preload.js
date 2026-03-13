const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

function subscribe(channel, listener) {
  const wrappedListener = (_event, payload) => {
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
  openRecentContentRoot: (contentRoot) => invoke('markdeck:open-recent-content-root', contentRoot),
  listDirectory: (relativePath = '') => invoke('markdeck:list-directory', relativePath),
  buildDocumentTree: (relativePath = '', depth = 2) => invoke('markdeck:build-document-tree', relativePath, depth),
  readMarkdownDocument: (relativePath) => invoke('markdeck:read-markdown-document', relativePath),
  collectMarkdownRelativePaths: () => invoke('markdeck:collect-markdown-relative-paths'),
  searchMarkdownDocuments: (query) => invoke('markdeck:search-markdown-documents', query),
  getSearchStatus: () => invoke('markdeck:get-search-status'),
  readAsset: (relativePath) => invoke('markdeck:read-asset', relativePath),
  executeCommand: (command, payload = null) => invoke('markdeck:execute-command', command, payload),
  onContentInvalidated: (listener) => subscribe('markdeck:content-invalidated', listener),
  onContentRootChanged: (listener) => subscribe('markdeck:content-root-changed', listener),
  onCommand: (listener) => subscribe('markdeck:command', listener),
});
