const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('markdeckDesktop', {
  getContentRoot: () => ipcRenderer.invoke('markdeck:get-content-root'),
  chooseContentRoot: () => ipcRenderer.invoke('markdeck:choose-content-root'),
});
