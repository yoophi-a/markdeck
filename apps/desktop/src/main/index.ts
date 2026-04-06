const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');

const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const runtimeModulePath = rendererUrl
  ? path.join(process.cwd(), 'src', 'main', 'app', 'create-markdeck-desktop-runtime')
  : './app/create-markdeck-desktop-runtime';
const { createMarkdeckDesktopRuntime } = require(runtimeModulePath);
const preloadPath = path.join(__dirname, '../preload/index.js');
const rendererHtmlPath = path.join(__dirname, '../renderer/index.html');

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  const runtime = createMarkdeckDesktopRuntime({
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    preloadPath,
    loadWindow: async (window: Electron.BrowserWindow) => {
      if (rendererUrl) {
        await window.loadURL(rendererUrl);
        return;
      }

      await window.loadFile(rendererHtmlPath);
    },
  });

  runtime.initializeLaunchTarget(process.argv);

  app.on('second-instance', (_event: Electron.Event, argv: string[]) => {
    runtime.handleSecondInstance(argv);
  });

  app.whenReady().then(async () => {
    runtime.desktopMainService.registerIpcHandlers();
    runtime.desktopMainService.rebuildApplicationMenu();
    runtime.desktopMainService.restartContentWatcher();
    runtime.createWindow();

    try {
      await runtime.loadApp();
    } catch (error) {
      console.error('Failed to load MarkDeck desktop app', error);
    }

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        runtime.createWindow();

        try {
          await runtime.loadApp();
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
    runtime.shutdown();
  });
}
