const path = require('node:path');
const { resolveLaunchTargetFromArgv } = require('../core/desktop-core');
const { createJsonConfigStore } = require('../infrastructure/node/create-json-config-store');
const { createContentWatcher } = require('../infrastructure/node/create-content-watcher');
const { createElectronShell } = require('../infrastructure/electron/create-electron-shell');
const { createElectronMenuAdapter } = require('../infrastructure/electron/create-electron-menu-adapter');
const { createMarkdeckDesktopService } = require('../application/create-markdeck-desktop-service');

function createMarkdeckDesktopRuntime({ app, BrowserWindow, dialog, ipcMain, env = process.env, preloadPath, loadWindow }) {
  const isDev = !app.isPackaged;
  const configPath = path.join(app.getPath('userData'), 'markdeck-desktop.json');

  let mainWindow = null;

  const shell = createElectronShell({
    ipcMain,
    dialog,
    getMainWindow: () => mainWindow,
  });

  const desktopMainService = createMarkdeckDesktopService({
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
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    return mainWindow;
  }

  async function loadApp() {
    if (!mainWindow) {
      return;
    }

    await loadWindow(mainWindow);
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
  }

  return {
    createWindow,
    desktopMainService,
    handleSecondInstance,
    initializeLaunchTarget,
    loadApp,
    shutdown,
  };
}

module.exports = {
  createMarkdeckDesktopRuntime,
};
