const fs = require('node:fs');

function createContentWatcher({ reloadDelayMs = 180 } = {}) {
  let contentWatcher = null;
  let contentWatcherReloadTimer = null;

  return {
    scheduleReload(callback) {
      if (contentWatcherReloadTimer) {
        clearTimeout(contentWatcherReloadTimer);
      }

      contentWatcherReloadTimer = setTimeout(callback, reloadDelayMs);
    },
    restart({ contentRoot, onContentChanged, onError }) {
      this.close();

      if (!contentRoot || !fs.existsSync(contentRoot)) {
        return;
      }

      try {
        contentWatcher = fs.watch(contentRoot, { recursive: true }, (_eventType, filename) => {
          onContentChanged(filename);
        });

        contentWatcher.on('error', () => {
          onError();
        });
      } catch {
        contentWatcher = null;
      }
    },
    close() {
      if (contentWatcher) {
        contentWatcher.close();
        contentWatcher = null;
      }

      if (contentWatcherReloadTimer) {
        clearTimeout(contentWatcherReloadTimer);
        contentWatcherReloadTimer = null;
      }
    },
  };
}

module.exports = {
  createContentWatcher,
};
