const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { createDesktopMainRuntime } = require('./main/bootstrap/create-desktop-main-runtime');

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  const runtime = createDesktopMainRuntime({
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    dirname: __dirname,
  });

  runtime.initializeLaunchTarget(process.argv);

  app.on('second-instance', (_event, argv) => {
    runtime.handleSecondInstance(argv);
  });

  app.whenReady().then(async () => {
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
