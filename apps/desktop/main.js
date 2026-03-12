const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

const WEB_PORT = Number(process.env.MARKDECK_WEB_PORT || 3210);
const WEB_URL = process.env.MARKDECK_WEB_URL || `http://127.0.0.1:${WEB_PORT}`;
const isDev = !app.isPackaged;
const configPath = path.join(app.getPath('userData'), 'markdeck-desktop.json');
const DEFAULT_IGNORE_PATTERNS = ['.git', 'node_modules'];

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

function getContentRoot() {
  return path.resolve(desktopConfig.contentRoot || process.env.MARKDECK_CONTENT_ROOT || process.cwd());
}

function getIgnorePatterns() {
  const rawValue = process.env.MARKDECK_IGNORE_PATTERNS;
  const customPatterns = rawValue
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return customPatterns && customPatterns.length > 0 ? customPatterns : DEFAULT_IGNORE_PATTERNS;
}

function normalizeSegments(segments = []) {
  return segments.filter(Boolean);
}

function normalizeRelativePath(relativePath = '') {
  return normalizeSegments(relativePath.split('/')).join('/');
}

function assertSafePath(relativePath) {
  const contentRoot = getContentRoot();
  const resolvedPath = path.resolve(contentRoot, relativePath);
  const relativeToRoot = path.relative(contentRoot, resolvedPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Unsafe path outside of content root');
  }

  return resolvedPath;
}

function matchesPattern(entryName, pattern) {
  if (pattern === entryName) {
    return true;
  }

  if (pattern.startsWith('*.')) {
    return entryName.toLowerCase().endsWith(pattern.slice(1).toLowerCase());
  }

  return false;
}

function shouldIgnoreEntry(entryName) {
  return entryName.startsWith('.') || getIgnorePatterns().some((pattern) => matchesPattern(entryName, pattern));
}

function sortBrowserEntries(a, b) {
  if (a.type === b.type) return a.name.localeCompare(b.name);
  if (a.type === 'directory') return -1;
  if (b.type === 'directory') return 1;
  if (a.type === 'markdown') return -1;
  if (b.type === 'markdown') return 1;
  return a.name.localeCompare(b.name);
}

function sortTreeNodes(a, b) {
  if (a.type === b.type) {
    return a.name.localeCompare(b.name);
  }

  if (a.type === 'directory') return -1;
  return 1;
}

function extractTitle(relativePath, content) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(relativePath, '.md');
}

async function listDirectory(relativePath = '') {
  const normalizedPath = normalizeRelativePath(relativePath);
  const absolutePath = assertSafePath(normalizedPath);
  const dirents = await fsp.readdir(absolutePath, { withFileTypes: true });

  const entries = await Promise.all(
    dirents
      .filter((entry) => !shouldIgnoreEntry(entry.name))
      .map(async (entry) => {
        const entryRelativePath = normalizeSegments([...normalizedPath.split('/').filter(Boolean), entry.name]).join('/');
        const entryAbsolutePath = path.join(absolutePath, entry.name);
        const stats = await fsp.stat(entryAbsolutePath);

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'directory',
            updatedAt: stats.mtime.toISOString(),
          };
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'markdown',
            size: stats.size,
            updatedAt: stats.mtime.toISOString(),
          };
        }

        return {
          name: entry.name,
          relativePath: entryRelativePath,
          type: 'file',
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
        };
      })
  );

  return entries.sort(sortBrowserEntries);
}

async function buildDocumentTree(relativePath = '', depth = 2) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const absolutePath = assertSafePath(normalizedPath);
  const dirents = await fsp.readdir(absolutePath, { withFileTypes: true });

  const nodes = await Promise.all(
    dirents
      .filter((entry) => !shouldIgnoreEntry(entry.name))
      .map(async (entry) => {
        const entryRelativePath = normalizeSegments([...normalizedPath.split('/').filter(Boolean), entry.name]).join('/');

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'directory',
            children: depth > 1 ? await buildDocumentTree(entryRelativePath, depth - 1) : undefined,
          };
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'markdown',
          };
        }

        return null;
      })
  );

  return nodes.filter(Boolean).sort(sortTreeNodes);
}

async function readMarkdownDocument(relativePath) {
  const normalizedPath = normalizeRelativePath(relativePath);

  if (!normalizedPath.toLowerCase().endsWith('.md')) {
    throw new Error('Only markdown files are supported');
  }

  const absolutePath = assertSafePath(normalizedPath);
  const [content, stats] = await Promise.all([fsp.readFile(absolutePath, 'utf8'), fsp.stat(absolutePath)]);

  return {
    absolutePath,
    relativePath: normalizedPath,
    content,
    title: extractTitle(normalizedPath, content),
    size: stats.size,
    updatedAt: stats.mtime.toISOString(),
  };
}

async function collectMarkdownFiles(directoryPath) {
  const dirents = await fsp.readdir(directoryPath, { withFileTypes: true });
  const nestedResults = await Promise.all(
    dirents
      .filter((entry) => !shouldIgnoreEntry(entry.name))
      .map(async (entry) => {
        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          return collectMarkdownFiles(entryPath);
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          return [entryPath];
        }

        return [];
      })
  );

  return nestedResults.flat();
}

async function collectMarkdownRelativePaths() {
  const contentRoot = getContentRoot();
  const markdownFiles = await collectMarkdownFiles(contentRoot);
  return markdownFiles
    .map((filePath) => path.relative(contentRoot, filePath).split(path.sep).join('/'))
    .sort((a, b) => a.localeCompare(b));
}

async function searchMarkdownDocuments(query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const contentRoot = getContentRoot();
  const markdownFiles = await collectMarkdownFiles(contentRoot);
  const results = await Promise.all(
    markdownFiles.map(async (filePath) => {
      const relativePath = path.relative(contentRoot, filePath).split(path.sep).join('/');
      const [content, stats] = await Promise.all([fsp.readFile(filePath, 'utf8'), fsp.stat(filePath)]);
      const title = extractTitle(relativePath, content);
      const haystack = `${relativePath}\n${title}\n${content}`.toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return null;
      }

      return {
        relativePath,
        title,
        snippet: buildSnippet(content, normalizedQuery),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
      };
    })
  );

  return results.filter(Boolean).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function buildSnippet(content, normalizedQuery) {
  const compact = content.replace(/\s+/g, ' ').trim();
  const index = compact.toLowerCase().indexOf(normalizedQuery);

  if (index === -1) {
    return compact.slice(0, 180);
  }

  const start = Math.max(0, index - 60);
  const end = Math.min(compact.length, index + normalizedQuery.length + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < compact.length ? '…' : '';

  return `${prefix}${compact.slice(start, end)}${suffix}`;
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
    MARKDECK_CONTENT_ROOT: getContentRoot(),
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
ipcMain.handle('markdeck:list-directory', (_event, relativePath = '') => listDirectory(relativePath));
ipcMain.handle('markdeck:build-document-tree', (_event, relativePath = '', depth = 2) => buildDocumentTree(relativePath, depth));
ipcMain.handle('markdeck:read-markdown-document', (_event, relativePath) => readMarkdownDocument(relativePath));
ipcMain.handle('markdeck:collect-markdown-relative-paths', () => collectMarkdownRelativePaths());
ipcMain.handle('markdeck:search-markdown-documents', (_event, query) => searchMarkdownDocuments(query));

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
