const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const { resolveLaunchTargetFromArgv } = require('./main-core');
const { createJsonConfigStore } = require('./main/adapters/node/config-store');
const { createContentWatcher } = require('./main/adapters/node/content-watcher');
const { createWebProcessController } = require('./main/adapters/node/web-process');
const { createElectronShell } = require('./main/adapters/electron/shell');
const { createElectronMenuAdapter } = require('./main/adapters/electron/menu-adapter');
const { createDesktopMainService } = require('./main/application/create-desktop-main-service');

const gotSingleInstanceLock = app.requestSingleInstanceLock();
const WEB_PORT = Number(process.env.MARKDECK_WEB_PORT || 3210);
const WEB_URL = process.env.MARKDECK_WEB_URL || `http://127.0.0.1:${WEB_PORT}`;
const isDev = !app.isPackaged;
const configPath = path.join(app.getPath('userData'), 'markdeck-desktop.json');

let mainWindow = null;

const shell = createElectronShell({
  ipcMain,
  dialog,
  getMainWindow: () => mainWindow,
});

const desktopMainService = createDesktopMainService({
  env: process.env,
  configStore: createJsonConfigStore({
    configPath,
    fallbackConfig: () => ({ contentRoot: process.env.MARKDECK_CONTENT_ROOT || null }),
  }),
  shell,
  watcher: createContentWatcher(),
  menuAdapter: createElectronMenuAdapter({ isDev }),
});

desktopMainService.registerIpcHandlers();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createWebEnv() {
  const configuredContentRoot = desktopMainService.getConfiguredDesktopContentRoot();

  return {
    ...process.env,
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
  desktopDirname: __dirname,
});

async function loadApp() {
  const url = await webProcessController.ensureWebApp();
  await mainWindow.loadURL(`${url}/desktop#/`);
  desktopMainService.applyPendingLaunchTarget();
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  desktopMainService.setPendingLaunchTarget(resolveLaunchTargetFromArgv(process.argv));

  app.on('second-instance', (_event, argv) => {
    shell.focusMainWindow();
    desktopMainService.queueOrApplyLaunchTarget(resolveLaunchTargetFromArgv(argv));
  });

  app.whenReady().then(async () => {
    desktopMainService.rebuildApplicationMenu();
    desktopMainService.restartContentWatcher();
    createWindow();

    try {
      await loadApp();
    } catch (error) {
      console.error('Failed to load MarkDeck desktop app', error);
    }

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();

        try {
          await loadApp();
        } catch (error) {
          console.error('Failed to load MarkDeck desktop app on activate', error);
        }
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    desktopMainService.shutdown();
    webProcessController.stop();
  });
}
