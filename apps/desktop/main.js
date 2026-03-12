const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

const WEB_PORT = Number(process.env.MARKDECK_WEB_PORT || 3210);
const WEB_URL = process.env.MARKDECK_WEB_URL || `http://127.0.0.1:${WEB_PORT}`;
const isDev = !app.isPackaged;
const configPath = path.join(app.getPath('userData'), 'markdeck-desktop.json');

let mainWindow = null;
let webProcess = null;
let desktopConfig = readConfig();

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return { contentRoot: process.env.MARKDECK_CONTENT_ROOT || null };
  }
}

function writeConfig(nextConfig) {
  desktopConfig = nextConfig;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(nextConfig, null, 2));
}

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
  return {
    ...process.env,
    PORT: String(WEB_PORT),
    HOSTNAME: '127.0.0.1',
    MARKDECK_CONTENT_ROOT: desktopConfig.contentRoot || process.env.MARKDECK_CONTENT_ROOT || process.cwd(),
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
  await mainWindow.loadURL(url);
}

async function restartWebApp() {
  if (webProcess) {
    webProcess.kill();
    webProcess = null;
  }

  if (mainWindow) {
    await loadApp();
  }
}

ipcMain.handle('markdeck:get-content-root', () => desktopConfig.contentRoot);
ipcMain.handle('markdeck:choose-content-root', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: desktopConfig.contentRoot || undefined,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return desktopConfig.contentRoot;
  }

  const contentRoot = result.filePaths[0];
  writeConfig({ ...desktopConfig, contentRoot });
  await restartWebApp();
  return contentRoot;
});

app.whenReady().then(async () => {
  createWindow();
  await loadApp();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      await loadApp();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (webProcess) {
    webProcess.kill();
  }
});
