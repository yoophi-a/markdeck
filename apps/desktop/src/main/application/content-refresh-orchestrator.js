function createContentRefreshOrchestrator({ getConfiguredDesktopContentRoot, contentRepository, watcher, emitDesktopEvent }) {
  function emitContentInvalidated(relativePath = null, reason = 'unknown') {
    contentRepository.invalidateCachesForPath(relativePath);
    emitDesktopEvent('markdeck:content-invalidated', {
      relativePath,
      reason,
      contentRoot: getConfiguredDesktopContentRoot(),
      changedAt: new Date().toISOString(),
    });
  }

  function scheduleContentReload(relativePath, reason) {
    watcher.scheduleReload(() => {
      emitContentInvalidated(relativePath, reason);
    });
  }

  function restartContentWatcher() {
    watcher.restart({
      contentRoot: getConfiguredDesktopContentRoot(),
      onContentChanged: (filename) => {
        const relativePath = typeof filename === 'string' && filename.trim() ? contentRepository.normalizeRelativePath(filename) : null;
        scheduleContentReload(relativePath, 'watcher');
      },
      onError: () => {
        scheduleContentReload(null, 'watcher-error');
        restartContentWatcher();
      },
    });
  }

  return {
    emitContentInvalidated,
    restartContentWatcher,
  };
}

module.exports = {
  createContentRefreshOrchestrator,
};
