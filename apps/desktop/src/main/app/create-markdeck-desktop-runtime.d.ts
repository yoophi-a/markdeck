import type { App, BrowserWindow, IpcMain, OpenDialog, BrowserWindowConstructorOptions } from 'electron';

export interface MarkdeckDesktopRuntime {
  createWindow: () => BrowserWindow;
  desktopMainService: {
    rebuildApplicationMenu: () => void;
    restartContentWatcher: () => void;
    applyPendingLaunchTarget: () => boolean;
    queueOrApplyLaunchTarget: (target: unknown) => boolean;
    setPendingLaunchTarget: (target: unknown) => void;
    shutdown: () => void;
  };
  handleSecondInstance: (argv: string[]) => void;
  initializeLaunchTarget: (argv?: string[]) => void;
  loadApp: () => Promise<void>;
  shutdown: () => void;
}

export function createMarkdeckDesktopRuntime(args: {
  app: App;
  BrowserWindow: { new (options: BrowserWindowConstructorOptions): BrowserWindow; getAllWindows(): BrowserWindow[] };
  dialog: Electron.Dialog;
  ipcMain: IpcMain;
  env?: NodeJS.ProcessEnv;
  preloadPath: string;
  loadWindow: (window: BrowserWindow) => Promise<void>;
}): MarkdeckDesktopRuntime;
