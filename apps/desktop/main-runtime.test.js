const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function installRuntimeDoubles(t) {
  const configStoreModule = require('./main/adapters/node/config-store');
  const contentWatcherModule = require('./main/adapters/node/content-watcher');
  const webProcessModule = require('./main/adapters/node/web-process');
  const shellModule = require('./main/adapters/electron/shell');
  const menuAdapterModule = require('./main/adapters/electron/menu-adapter');
  const serviceModule = require('./main/application/create-desktop-main-service');

  const originals = {
    createJsonConfigStore: configStoreModule.createJsonConfigStore,
    createContentWatcher: contentWatcherModule.createContentWatcher,
    createWebProcessController: webProcessModule.createWebProcessController,
    createElectronShell: shellModule.createElectronShell,
    createElectronMenuAdapter: menuAdapterModule.createElectronMenuAdapter,
    createDesktopMainService: serviceModule.createDesktopMainService,
  };

  const state = {
    configStoreArgs: null,
    webProcessArgs: null,
    shellArgs: null,
    menuAdapterArgs: null,
    serviceArgs: null,
    ensuredWebAppCalls: 0,
    stopped: 0,
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
  webProcessModule.createWebProcessController = (args) => {
    state.webProcessArgs = args;
    return {
      async ensureWebApp() {
        state.ensuredWebAppCalls += 1;
        return 'http://127.0.0.1:4321';
      },
      stop() {
        state.stopped += 1;
      },
    };
  };
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
  serviceModule.createDesktopMainService = (args) => {
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
    webProcessModule.createWebProcessController = originals.createWebProcessController;
    shellModule.createElectronShell = originals.createElectronShell;
    menuAdapterModule.createElectronMenuAdapter = originals.createElectronMenuAdapter;
    serviceModule.createDesktopMainService = originals.createDesktopMainService;
  });

  return state;
}

test('createDesktopMainRuntime composes adapters and delegates launch/web lifecycle responsibilities', async (t) => {
  const state = installRuntimeDoubles(t);
  delete require.cache[require.resolve('./main/bootstrap/create-desktop-main-runtime')];
  const { createDesktopMainRuntime } = require('./main/bootstrap/create-desktop-main-runtime');

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

  const runtime = createDesktopMainRuntime({
    app,
    BrowserWindow,
    dialog: { kind: 'dialog' },
    ipcMain: { kind: 'ipc' },
    env: { MARKDECK_CONTENT_ROOT: '/env/root', MARKDECK_WEB_PORT: '4321' },
    dirname: '/repo/apps/desktop/main/bootstrap',
  });

  assert.equal(state.menuAdapterArgs.isDev, true);
  assert.equal(state.configStoreArgs.configPath, '/tmp/user-data/markdeck-desktop.json');
  assert.deepEqual(state.configStoreArgs.fallbackConfig(), { contentRoot: '/env/root' });
  assert.equal(state.webProcessArgs.webPort, 4321);
  assert.equal(state.webProcessArgs.webUrl, 'http://127.0.0.1:4321');
  assert.equal(state.webProcessArgs.desktopDirname, '/repo/apps/desktop');
  assert.equal(state.webProcessArgs.createWebEnv().MARKDECK_CONTENT_ROOT, '/configured/root');

  runtime.initializeLaunchTarget(['MarkDeck', launchRoot]);
  assert.equal(state.setPendingLaunchTargetCalls.length, 1);
  assert.equal(state.setPendingLaunchTargetCalls[0]?.contentRoot, launchRoot);

  const window = runtime.createWindow();
  assert.equal(state.windows.length, 1);
  assert.equal(window.options.webPreferences.preload, '/repo/apps/desktop/preload.js');

  await runtime.loadApp();
  assert.equal(state.ensuredWebAppCalls, 1);
  assert.equal(window.url, 'http://127.0.0.1:4321/desktop#/');
  assert.equal(state.applyPendingLaunchTargetCalls, 1);

  runtime.handleSecondInstance(['MarkDeck', markdownPath]);
  assert.equal(state.focused, 1);
  assert.equal(state.queueOrApplyLaunchTargetCalls.length, 1);
  assert.equal(state.queueOrApplyLaunchTargetCalls[0]?.relativeDocumentPath, 'readme.md');

  runtime.shutdown();
  assert.equal(state.serviceShutdown, 1);
  assert.equal(state.stopped, 1);
});
