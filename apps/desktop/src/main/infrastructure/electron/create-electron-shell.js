const path = require('node:path');

function createElectronShell({ ipcMain, dialog, getMainWindow }) {
  return {
    canApplyTargetNow() {
      const mainWindow = getMainWindow();
      return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isLoading());
    },
    emitEvent(channel, payload) {
      const mainWindow = getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      mainWindow.webContents.send(channel, payload);
    },
    focusMainWindow() {
      const mainWindow = getMainWindow();
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
      return dialog.showOpenDialog(getMainWindow(), {
        properties: ['openDirectory'],
        defaultPath,
      });
    },
    resolvePath(targetPath) {
      return path.resolve(targetPath);
    },
  };
}

module.exports = {
  createElectronShell,
};
