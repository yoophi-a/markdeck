function createDesktopMainQueries({ getConfiguredDesktopContentRoot, getDesktopRecentContentRoots, contentRepository }) {
  return {
    getContentRoot() {
      return getConfiguredDesktopContentRoot();
    },
    getRecentContentRoots() {
      return getDesktopRecentContentRoots();
    },
    listDirectory(relativePath = '') {
      return contentRepository.listDirectory(relativePath);
    },
    buildDocumentTree(relativePath = '', depth = 2) {
      return contentRepository.buildDocumentTree(relativePath, depth);
    },
    readMarkdownDocument(relativePath) {
      return contentRepository.readMarkdownDocument(relativePath);
    },
    collectMarkdownRelativePaths() {
      return contentRepository.collectMarkdownRelativePaths();
    },
    searchMarkdownDocuments(query) {
      return contentRepository.searchMarkdownDocuments(query);
    },
    getSearchStatus() {
      return contentRepository.getSearchStatus();
    },
    readAsset(relativePath) {
      return contentRepository.readAsset(relativePath);
    },
    readMemoFile(relativePath) {
      return contentRepository.readMemoFile(relativePath);
    },
    writeMemoFile(relativePath, content) {
      return contentRepository.writeMemoFile(relativePath, content);
    },
  };
}

module.exports = {
  createDesktopMainQueries,
};
