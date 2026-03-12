const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('markdeckDesktop', {
  getContentRoot: () => ipcRenderer.invoke('markdeck:get-content-root'),
  chooseContentRoot: () => ipcRenderer.invoke('markdeck:choose-content-root'),
  listDirectory: (relativePath = '') => ipcRenderer.invoke('markdeck:list-directory', relativePath),
  buildDocumentTree: (relativePath = '', depth = 2) => ipcRenderer.invoke('markdeck:build-document-tree', relativePath, depth),
  readMarkdownDocument: (relativePath) => ipcRenderer.invoke('markdeck:read-markdown-document', relativePath),
  collectMarkdownRelativePaths: () => ipcRenderer.invoke('markdeck:collect-markdown-relative-paths'),
  searchMarkdownDocuments: (query) => ipcRenderer.invoke('markdeck:search-markdown-documents', query),
  readAsset: (relativePath) => ipcRenderer.invoke('markdeck:read-asset', relativePath),
});
