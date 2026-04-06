const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function installRuntimeDoubles(t) {
  const configStoreModule = require('../infrastructure/node/create-json-config-store');
  const contentWatcherModule = require('../infrastructure/node/create-content-watcher');
  const shellModule = require('../infrastructure/electron/create-electron-shell');
  const menuAdapterModule = require('../infrastructure/electron/create-electron-menu-adapter');
  const serviceModule = require('../application/create-markdeck-desktop-service');

  const originals = {
    createJsonConfigStore: configStoreModule.createJsonConfigStore,
    createContentWatcher: contentWatcherModule.createContentWatcher,
    createElectronShell: shellModule.createElectronShell,
    createElectronMenuAdapter: menuAdapterModule.createElectronMenuAdapter,
    createMarkdeckDesktopService: serviceModule.createMarkdeckDesktopService,
  };

  const state = {
    configStoreArgs: null,
    shellArgs: null,
    menuAdapterArgs: null,
    serviceArgs: null,
    setPendingLaunchTargetCalls: [],
    queueOrApplyLaunchTargetCalls: [],
    applyPendingLaunchTargetCalls: 0,
    configuredContentRoot: '/configured/root',
    windows: [],
  };

  configStoreModule.createJsonConfigStore = (args) => {
    state.configStoreArgs = args;
    return { read() { return { contentRoot: null, recentContentRoots: [] }; }, write(nextConfig) { return nextConfig; } };
  };
  contentWatcherModule.createContentWatcher = () => ({ scheduleReload() {}, restart() {}, close() {} });
  shellModule.createElectronShell = (args) => {
    state.shellArgs = args;
    return {
      focusMainWindow() {
        state.focused = (state.focused || 0) + 1;
      },
    };
  };
  menuAdapterModule.createElectronMenuAdapter = (args) => {
    state.menuAdapterArgs = args;
    return { kind: 'menu-adapter' };
  };
  serviceModule.createMarkdeckDesktopService = (args) => {
    state.serviceArgs = args;
    return {
      applyPendingLaunchTarget() {
        state.applyPendingLaunchTargetCalls += 1;
        return true;
      },
      getConfiguredDesktopContentRoot() {
        return state.configuredContentRoot;
      },
      queueOrApplyLaunchTarget(target) {
        state.queueOrApplyLaunchTargetCalls.push(target);
        return true;
      },
      setPendingLaunchTarget(target) {
        state.setPendingLaunchTargetCalls.push(target);
      },
      shutdown() {
        state.serviceShutdown = (state.serviceShutdown || 0) + 1;
      },
    };
  };

  t.after(() => {
    configStoreModule.createJsonConfigStore = originals.createJsonConfigStore;
    contentWatcherModule.createContentWatcher = originals.createContentWatcher;
    shellModule.createElectronShell = originals.createElectronShell;
    menuAdapterModule.createElectronMenuAdapter = originals.createElectronMenuAdapter;
    serviceModule.createMarkdeckDesktopService = originals.createMarkdeckDesktopService;
  });

  return state;
}

test('createMarkdeckDesktopRuntime composes adapters and delegates launch and window lifecycle responsibilities', async (t) => {
  const state = installRuntimeDoubles(t);
  delete require.cache[require.resolve('./create-markdeck-desktop-runtime')];
  const { createMarkdeckDesktopRuntime } = require('./create-markdeck-desktop-runtime');

  const app = {
    isPackaged: false,
    getPath(name) {
      assert.equal(name, 'userData');
      return '/tmp/user-data';
    },
  };
  function BrowserWindow(options) {
    const windowState = {
      options,
      url: null,
      listeners: {},
      loadURL: async (url) => {
        windowState.url = url;
      },
      on(event, listener) {
        windowState.listeners[event] = listener;
      },
    };
    state.windows.push(windowState);
    return windowState;
  }

  const launchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'markdeck-runtime-'));
  const markdownPath = path.join(launchRoot, 'readme.md');
  fs.writeFileSync(markdownPath, '# hello');

  const runtime = createMarkdeckDesktopRuntime({
    app,
    BrowserWindow,
    dialog: { kind: 'dialog' },
    ipcMain: { kind: 'ipc' },
    env: { MARKDECK_CONTENT_ROOT: '/env/root' },
    preloadPath: '/repo/apps/desktop/out/main/preload.js',
    loadWindow: async (window) => {
      state.loadedWindow = window;
      window.url = 'app://renderer';
    },
  });

  assert.equal(state.menuAdapterArgs.isDev, true);
  assert.equal(state.configStoreArgs.configPath, '/tmp/user-data/markdeck-desktop.json');
  assert.deepEqual(state.configStoreArgs.fallbackConfig(), { contentRoot: '/env/root' });

  runtime.initializeLaunchTarget(['MarkDeck', launchRoot]);
  assert.equal(state.setPendingLaunchTargetCalls.length, 1);
  assert.equal(state.setPendingLaunchTargetCalls[0]?.contentRoot, launchRoot);

  const window = runtime.createWindow();
  assert.equal(state.windows.length, 1);
  assert.equal(window.options.webPreferences.preload, '/repo/apps/desktop/out/main/preload.js');

  await runtime.loadApp();
  assert.equal(state.loadedWindow, window);
  assert.equal(window.url, 'app://renderer');
  assert.equal(state.applyPendingLaunchTargetCalls, 1);

  runtime.handleSecondInstance(['MarkDeck', markdownPath]);
  assert.equal(state.focused, 1);
  assert.equal(state.queueOrApplyLaunchTargetCalls.length, 1);
  assert.equal(state.queueOrApplyLaunchTargetCalls[0]?.relativeDocumentPath, 'readme.md');

  runtime.shutdown();
  assert.equal(state.serviceShutdown, 1);
});
