const path = require('node:path');
const { resolveLaunchTargetFromArgv } = require('../../main-core');
const { createJsonConfigStore } = require('../adapters/node/config-store');
const { createContentWatcher } = require('../adapters/node/content-watcher');
const { createWebProcessController } = require('../adapters/node/web-process');
const { createElectronShell } = require('../adapters/electron/shell');
const { createElectronMenuAdapter } = require('../adapters/electron/menu-adapter');
const { createDesktopMainService } = require('../application/create-desktop-main-service');

function createDesktopMainRuntime({ app, BrowserWindow, dialog, ipcMain, env = process.env, dirname = __dirname }) {
  const WEB_PORT = Number(env.MARKDECK_WEB_PORT || 3210);
  const WEB_URL = env.MARKDECK_WEB_URL || `http://127.0.0.1:${WEB_PORT}`;
  const isDev = !app.isPackaged;
  const configPath = path.join(app.getPath('userData'), 'markdeck-desktop.json');

  let mainWindow = null;

  const shell = createElectronShell({
    ipcMain,
    dialog,
    getMainWindow: () => mainWindow,
  });

  const desktopMainService = createDesktopMainService({
    env,
    configStore: createJsonConfigStore({
      configPath,
      fallbackConfig: () => ({ contentRoot: env.MARKDECK_CONTENT_ROOT || null }),
    }),
    shell,
    watcher: createContentWatcher(),
    menuAdapter: createElectronMenuAdapter({ isDev }),
  });

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 1024,
      minHeight: 720,
      webPreferences: {
        preload: path.join(dirname, '../../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    return mainWindow;
  }

  function createWebEnv() {
    const configuredContentRoot = desktopMainService.getConfiguredDesktopContentRoot();

    return {
      ...env,
      PORT: String(WEB_PORT),
      HOSTNAME: '127.0.0.1',
      ...(configuredContentRoot ? { MARKDECK_CONTENT_ROOT: configuredContentRoot } : {}),
    };
  }

  const webProcessController = createWebProcessController({
    isDev,
    webPort: WEB_PORT,
    webUrl: WEB_URL,
    createWebEnv,
    desktopDirname: path.resolve(dirname, '../..'),
  });

  async function loadApp() {
    const url = await webProcessController.ensureWebApp();
    await mainWindow.loadURL(`${url}/desktop#/`);
    desktopMainService.applyPendingLaunchTarget();
  }

  function initializeLaunchTarget(argv = process.argv) {
    desktopMainService.setPendingLaunchTarget(resolveLaunchTargetFromArgv(argv));
  }

  function handleSecondInstance(argv) {
    shell.focusMainWindow();
    desktopMainService.queueOrApplyLaunchTarget(resolveLaunchTargetFromArgv(argv));
  }

  function shutdown() {
    desktopMainService.shutdown();
    webProcessController.stop();
  }

  return {
    createWindow,
    desktopMainService,
    handleSecondInstance,
    initializeLaunchTarget,
    loadApp,
    shutdown,
    webProcessController,
  };
}

module.exports = {
  createDesktopMainRuntime,
};
