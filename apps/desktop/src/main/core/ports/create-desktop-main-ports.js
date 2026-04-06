const {
  assertFunction,
  assertObject,
  normalizeDirectoryPickerResult,
} = require('../desktop-contracts');

const REQUIRED_CONFIG_STORE_METHODS = ['read', 'write'];
const REQUIRED_SHELL_METHODS = ['canApplyTargetNow', 'emitEvent', 'focusMainWindow', 'handleIpc', 'chooseDirectory', 'resolvePath'];
const REQUIRED_WATCHER_METHODS = ['scheduleReload', 'restart', 'close'];
const REQUIRED_MENU_ADAPTER_METHODS = ['buildTemplate', 'set'];

function assertPortMethods(portName, value, methodNames) {
  assertObject(value, `${portName} port`);

  for (const methodName of methodNames) {
    assertFunction(value[methodName], `${portName}.${methodName}`);
  }
}

function normalizeConfigSnapshot(config) {
  assertObject(config, 'config snapshot');

  const contentRoot = config.contentRoot == null ? null : config.contentRoot;
  const recentContentRoots = Array.isArray(config.recentContentRoots) ? [...config.recentContentRoots] : [];

  if (contentRoot !== null && typeof contentRoot !== 'string') {
    throw new TypeError('Expected config snapshot.contentRoot to be a string or null');
  }

  if (recentContentRoots.some((value) => typeof value !== 'string')) {
    throw new TypeError('Expected config snapshot.recentContentRoots to contain only strings');
  }

  return {
    contentRoot,
    recentContentRoots,
  };
}

function createDesktopMainPorts({ configStore, shell, watcher, menuAdapter }) {
  assertPortMethods('configStore', configStore, REQUIRED_CONFIG_STORE_METHODS);
  assertPortMethods('shell', shell, REQUIRED_SHELL_METHODS);
  assertPortMethods('watcher', watcher, REQUIRED_WATCHER_METHODS);
  assertPortMethods('menuAdapter', menuAdapter, REQUIRED_MENU_ADAPTER_METHODS);

  return {
    configStore: {
      read() {
        return normalizeConfigSnapshot(configStore.read());
      },
      write(nextConfig) {
        return normalizeConfigSnapshot(configStore.write(nextConfig));
      },
    },
    shell: {
      canApplyTargetNow() {
        return Boolean(shell.canApplyTargetNow());
      },
      emitEvent(channel, payload) {
        return shell.emitEvent(channel, payload);
      },
      focusMainWindow() {
        return shell.focusMainWindow();
      },
      handleIpc(channel, handler) {
        return shell.handleIpc(channel, handler);
      },
      async chooseDirectory(args) {
        return normalizeDirectoryPickerResult(await shell.chooseDirectory(args));
      },
      resolvePath(targetPath) {
        if (typeof targetPath !== 'string' || !targetPath.trim()) {
          throw new TypeError('Expected shell.resolvePath targetPath to be a non-empty string');
        }

        const resolvedPath = shell.resolvePath(targetPath);
        if (typeof resolvedPath !== 'string' || !resolvedPath.trim()) {
          throw new TypeError('Expected shell.resolvePath to return a non-empty string');
        }

        return resolvedPath;
      },
    },
    watcher: {
      scheduleReload(callback) {
        assertFunction(callback, 'watcher.scheduleReload callback');
        return watcher.scheduleReload(callback);
      },
      restart(options) {
        assertObject(options, 'watcher.restart options');
        assertFunction(options.onContentChanged, 'watcher.restart options.onContentChanged');
        assertFunction(options.onError, 'watcher.restart options.onError');
        if (options.contentRoot != null && typeof options.contentRoot !== 'string') {
          throw new TypeError('Expected watcher.restart options.contentRoot to be a string or null');
        }

        return watcher.restart(options);
      },
      close() {
        return watcher.close();
      },
    },
    menuAdapter: {
      buildTemplate(args) {
        assertObject(args, 'menuAdapter.buildTemplate args');
        if (!Array.isArray(args.recentContentRoots) || args.recentContentRoots.some((value) => typeof value !== 'string')) {
          throw new TypeError('Expected menuAdapter.buildTemplate args.recentContentRoots to be an array of strings');
        }
        assertFunction(args.onCommand, 'menuAdapter.buildTemplate args.onCommand');
        assertFunction(args.onOpenRecentContentRoot, 'menuAdapter.buildTemplate args.onOpenRecentContentRoot');

        return menuAdapter.buildTemplate({
          ...args,
          recentContentRoots: [...args.recentContentRoots],
        });
      },
      set(template) {
        return menuAdapter.set(template);
      },
    },
  };
}

module.exports = {
  REQUIRED_CONFIG_STORE_METHODS,
  REQUIRED_MENU_ADAPTER_METHODS,
  REQUIRED_SHELL_METHODS,
  REQUIRED_WATCHER_METHODS,
  createDesktopMainPorts,
};
