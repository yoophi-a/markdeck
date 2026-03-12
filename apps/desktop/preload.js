const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('markdeckDesktop', {
  getContentRoot: () => invoke('markdeck:get-content-root'),
  chooseContentRoot: () => invoke('markdeck:choose-content-root'),
  listDirectory: (relativePath = '') => invoke('markdeck:list-directory', relativePath),
  buildDocumentTree: (relativePath = '', depth = 2) => invoke('markdeck:build-document-tree', relativePath, depth),
  readMarkdownDocument: (relativePath) => invoke('markdeck:read-markdown-document', relativePath),
  collectMarkdownRelativePaths: () => invoke('markdeck:collect-markdown-relative-paths'),
  searchMarkdownDocuments: (query) => invoke('markdeck:search-markdown-documents', query),
  readAsset: (relativePath) => invoke('markdeck:read-asset', relativePath),
});
