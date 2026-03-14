const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');
const { resolveLaunchTargetFromArgv } = require('./main-core');
const { createJsonConfigStore } = require('./main/adapters/node/config-store');
const { buildApplicationMenuTemplate } = require('./main/adapters/electron/application-menu');
const { createDesktopMainService } = require('./main/application/create-desktop-main-service');

const gotSingleInstanceLock = app.requestSingleInstanceLock();
const WEB_PORT = Number(process.env.MARKDECK_WEB_PORT || 3210);
const WEB_URL = process.env.MARKDECK_WEB_URL || `http://127.0.0.1:${WEB_PORT}`;
const isDev = !app.isPackaged;
const configPath = path.join(app.getPath('userData'), 'markdeck-desktop.json');

let mainWindow = null;
let webProcess = null;
let contentWatcher = null;
let contentWatcherReloadTimer = null;

function createShell() {
  return {
    canApplyTargetNow() {
      return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isLoading());
    },
    emitEvent(channel, payload) {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      mainWindow.webContents.send(channel, payload);
    },
    focusMainWindow() {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    },
    handleIpc(channel, handler) {
      ipcMain.handle(channel, async (_event, ...args) => handler(...args));
    },
    async chooseDirectory({ defaultPath }) {
      return dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        defaultPath,
      });
    },
    resolvePath(targetPath) {
      return path.resolve(targetPath);
    },
  };
}

function createWatcher() {
  return {
    scheduleReload(callback) {
      if (contentWatcherReloadTimer) {
        clearTimeout(contentWatcherReloadTimer);
      }

      contentWatcherReloadTimer = setTimeout(callback, 180);
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

function createMenuAdapter() {
  return {
    buildTemplate({ recentContentRoots, onCommand, onOpenRecentContentRoot }) {
      return buildApplicationMenuTemplate({
        isDev,
        recentContentRoots,
        onCommand,
        onOpenRecentContentRoot,
      });
    },
    set(template) {
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    },
  };
}

const desktopMainService = createDesktopMainService({
  env: process.env,
  configStore: createJsonConfigStore({
    configPath,
    fallbackConfig: () => ({ contentRoot: process.env.MARKDECK_CONTENT_ROOT || null }),
  }),
  shell: createShell(),
  watcher: createWatcher(),
  menuAdapter: createMenuAdapter(),
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

function waitForWeb(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('Timed out waiting for MarkDeck web app'));
          return;
        }

        setTimeout(attempt, 500);
      });
    };

    attempt();
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

function getStandaloneEntrypoint() {
  return path.join(process.resourcesPath, 'web', 'standalone', 'apps', 'web', 'server.js');
}

function getStandaloneCwd() {
  return path.dirname(getStandaloneEntrypoint());
}

function spawnWebProcess(command, args, cwd) {
  webProcess = spawn(command, args, {
    cwd,
    env: createWebEnv(),
    stdio: 'inherit',
  });

  webProcess.on('exit', () => {
    webProcess = null;
  });
}

async function ensureWebApp() {
  if (!webProcess) {
    if (isDev) {
      spawnWebProcess('npm', ['run', 'dev', '--', '--port', String(WEB_PORT)], path.resolve(__dirname, '../web'));
    } else {
      const entrypoint = getStandaloneEntrypoint();

      if (!fs.existsSync(entrypoint)) {
        throw new Error(`Standalone web bundle not found: ${entrypoint}`);
      }

      spawnWebProcess(process.execPath, [entrypoint], getStandaloneCwd());
    }
  }

  await waitForWeb(WEB_URL);
  return WEB_URL;
}

async function loadApp() {
  const url = await ensureWebApp();
  await mainWindow.loadURL(`${url}/desktop#/`);
  desktopMainService.applyPendingLaunchTarget();
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  desktopMainService.setPendingLaunchTarget(resolveLaunchTargetFromArgv(process.argv));

  app.on('second-instance', (_event, argv) => {
    createShell().focusMainWindow();
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

    if (webProcess) {
      webProcess.kill();
    }
  });
}
