const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
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
const MAX_RECENT_CONTENT_ROOTS = 8;
const SEARCH_RESULTS_CACHE_LIMIT = 24;
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

let mainWindow = null;
let webProcess = null;
let contentWatcher = null;
let contentWatcherReloadTimer = null;
let desktopConfig = readConfig();
let searchIndexPromise = null;
let searchIndexCache = null;
let searchResultsCache = new Map();
let documentCache = new Map();
let assetCache = new Map();

function readConfig() {
  try {
    return normalizeConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  } catch {
    return normalizeConfig({ contentRoot: process.env.MARKDECK_CONTENT_ROOT || null });
  }
}

function normalizeConfig(input = {}) {
  const contentRoot = typeof input.contentRoot === 'string' && input.contentRoot.trim() ? path.resolve(input.contentRoot) : null;
  const recentContentRoots = Array.isArray(input.recentContentRoots)
    ? input.recentContentRoots
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => path.resolve(value))
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, MAX_RECENT_CONTENT_ROOTS)
    : contentRoot
      ? [contentRoot]
      : [];

  return {
    contentRoot,
    recentContentRoots,
  };
}

function writeConfig(nextConfig) {
  desktopConfig = normalizeConfig(nextConfig);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(desktopConfig, null, 2));
  rebuildApplicationMenu();
}

function setContentRoot(contentRoot) {
  const normalizedRoot = contentRoot ? path.resolve(contentRoot) : null;
  const recentContentRoots = normalizedRoot
    ? [normalizedRoot, ...desktopConfig.recentContentRoots.filter((item) => item !== normalizedRoot)].slice(0, MAX_RECENT_CONTENT_ROOTS)
    : desktopConfig.recentContentRoots;

  writeConfig({
    ...desktopConfig,
    contentRoot: normalizedRoot,
    recentContentRoots,
  });

  invalidateAllDesktopCaches();
  restartContentWatcher();
  emitDesktopEvent('markdeck:content-root-changed', {
    contentRoot: normalizedRoot,
    recentContentRoots,
  });
}

function getConfiguredContentRoot() {
  const configuredRoot = desktopConfig.contentRoot || process.env.MARKDECK_CONTENT_ROOT || null;
  return configuredRoot ? path.resolve(configuredRoot) : null;
}

function getRecentContentRoots() {
  const currentRoot = getConfiguredContentRoot();
  const items = desktopConfig.recentContentRoots.filter((item, index, values) => values.indexOf(item) === index);

  if (!currentRoot) {
    return items;
  }

  return [currentRoot, ...items.filter((item) => item !== currentRoot)].slice(0, MAX_RECENT_CONTENT_ROOTS);
}

function getContentRoot() {
  const contentRoot = getConfiguredContentRoot();

  if (!contentRoot) {
    const error = new Error('Content root is not configured');
    error.code = 'CONTENT_ROOT_NOT_SET';
    throw error;
  }

  return contentRoot;
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

function toRelativePath(absolutePath) {
  const contentRoot = getContentRoot();
  return path.relative(contentRoot, absolutePath).split(path.sep).join('/');
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
  const stats = await fsp.stat(absolutePath);
  const cached = documentCache.get(normalizedPath);

  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
    return cached.payload;
  }

  const content = await fsp.readFile(absolutePath, 'utf8');
  const payload = {
    absolutePath,
    relativePath: normalizedPath,
    content,
    title: extractTitle(normalizedPath, content),
    size: stats.size,
    updatedAt: stats.mtime.toISOString(),
  };

  documentCache.set(normalizedPath, {
    mtimeMs: stats.mtimeMs,
    size: stats.size,
    payload,
  });

  return payload;
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

async function buildSearchIndex() {
  const contentRoot = getContentRoot();
  const markdownFiles = await collectMarkdownFiles(contentRoot);
  const documents = await Promise.all(
    markdownFiles.map(async (filePath) => {
      const relativePath = path.relative(contentRoot, filePath).split(path.sep).join('/');
      const [content, stats] = await Promise.all([fsp.readFile(filePath, 'utf8'), fsp.stat(filePath)]);
      const title = extractTitle(relativePath, content);

      return {
        relativePath,
        title,
        content,
        contentLower: `${relativePath}\n${title}\n${content}`.toLowerCase(),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
        mtimeMs: stats.mtimeMs,
      };
    })
  );

  documents.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    contentRoot,
    documents,
    markdownRelativePaths: documents.map((document) => document.relativePath),
    generatedAt: new Date().toISOString(),
  };
}

async function ensureSearchIndex() {
  const contentRoot = getContentRoot();

  if (searchIndexCache && searchIndexCache.contentRoot === contentRoot) {
    return searchIndexCache;
  }

  if (!searchIndexPromise) {
    searchIndexPromise = buildSearchIndex()
      .then((index) => {
        searchIndexCache = index;
        searchIndexPromise = null;
        return index;
      })
      .catch((error) => {
        searchIndexPromise = null;
        throw error;
      });
  }

  return searchIndexPromise;
}

async function collectMarkdownRelativePaths() {
  const index = await ensureSearchIndex();
  return [...index.markdownRelativePaths];
}

async function searchMarkdownDocuments(query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const cacheKey = `${getContentRoot()}::${normalizedQuery}`;
  const cached = searchResultsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const index = await ensureSearchIndex();
  const results = index.documents
    .filter((document) => document.contentLower.includes(normalizedQuery))
    .map((document) => ({
      relativePath: document.relativePath,
      title: document.title,
      snippet: buildSnippet(document.content, normalizedQuery),
      size: document.size,
      updatedAt: document.updatedAt,
    }));

  searchResultsCache.set(cacheKey, results);
  if (searchResultsCache.size > SEARCH_RESULTS_CACHE_LIMIT) {
    const firstKey = searchResultsCache.keys().next().value;
    if (firstKey) {
      searchResultsCache.delete(firstKey);
    }
  }

  return results;
}

async function getSearchStatus() {
  const index = await ensureSearchIndex();

  return {
    documentCount: index.documents.length,
    generatedAt: index.generatedAt,
    cachedQueryCount: searchResultsCache.size,
  };
}

async function readAsset(relativePath) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const absolutePath = assertSafePath(normalizedPath);
  const stats = await fsp.stat(absolutePath);
  const cached = assetCache.get(normalizedPath);

  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
    return cached.payload;
  }

  const buffer = await fsp.readFile(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const payload = {
    relativePath: normalizedPath,
    contentType: MIME_TYPES[extension] || 'application/octet-stream',
    dataBase64: buffer.toString('base64'),
    size: stats.size,
  };

  assetCache.set(normalizedPath, {
    mtimeMs: stats.mtimeMs,
    size: stats.size,
    payload,
  });

  return payload;
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

function invalidateAllDesktopCaches() {
  searchIndexCache = null;
  searchIndexPromise = null;
  searchResultsCache = new Map();
  documentCache = new Map();
  assetCache = new Map();
}

function invalidateContentCachesForPath(relativePath = null) {
  if (!relativePath) {
    invalidateAllDesktopCaches();
    return;
  }

  const normalizedPath = normalizeRelativePath(relativePath);
  const normalizedDirectoryPrefix = normalizedPath ? `${normalizedPath}/` : '';
  const isMarkdown = normalizedPath.toLowerCase().endsWith('.md');

  if (isMarkdown) {
    documentCache.delete(normalizedPath);
  }

  assetCache.delete(normalizedPath);

  if (!searchIndexCache) {
    searchResultsCache = new Map();
    return;
  }

  const shouldRebuildSearchIndex =
    !normalizedPath ||
    isMarkdown ||
    searchIndexCache.markdownRelativePaths.some((item) => item === normalizedPath || item.startsWith(normalizedDirectoryPrefix));

  if (shouldRebuildSearchIndex) {
    searchIndexCache = null;
  }

  searchResultsCache = new Map();
}

function emitDesktopEvent(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function emitContentInvalidated(relativePath = null, reason = 'unknown') {
  invalidateContentCachesForPath(relativePath);
  emitDesktopEvent('markdeck:content-invalidated', {
    relativePath,
    reason,
    contentRoot: getConfiguredContentRoot(),
    changedAt: new Date().toISOString(),
  });
}

function scheduleContentReload(relativePath, reason) {
  if (contentWatcherReloadTimer) {
    clearTimeout(contentWatcherReloadTimer);
  }

  contentWatcherReloadTimer = setTimeout(() => {
    emitContentInvalidated(relativePath, reason);
  }, 180);
}

function closeContentWatcher() {
  if (contentWatcher) {
    contentWatcher.close();
    contentWatcher = null;
  }

  if (contentWatcherReloadTimer) {
    clearTimeout(contentWatcherReloadTimer);
    contentWatcherReloadTimer = null;
  }
}

function restartContentWatcher() {
  closeContentWatcher();

  const contentRoot = getConfiguredContentRoot();
  if (!contentRoot || !fs.existsSync(contentRoot)) {
    return;
  }

  try {
    contentWatcher = fs.watch(contentRoot, { recursive: true }, (_eventType, filename) => {
      const relativePath = typeof filename === 'string' && filename.trim() ? normalizeRelativePath(filename) : null;
      scheduleContentReload(relativePath, 'watcher');
    });

    contentWatcher.on('error', () => {
      scheduleContentReload(null, 'watcher-error');
      restartContentWatcher();
    });
  } catch {
    contentWatcher = null;
  }
}

function toDesktopError(error) {
  if (error?.message === 'Unsafe path outside of content root') {
    return { code: 'UNSAFE_PATH', message: error.message };
  }

  if (error?.code === 'CONTENT_ROOT_NOT_SET') {
    return { code: 'CONTENT_ROOT_NOT_SET', message: '읽을 문서 폴더를 먼저 선택해 주세요.' };
  }

  if (error?.code === 'ENOENT') {
    return { code: 'NOT_FOUND', message: '파일이나 폴더를 찾을 수 없습니다.' };
  }

  if (error?.code === 'EACCES' || error?.code === 'EPERM') {
    return { code: 'PERMISSION_DENIED', message: '파일이나 폴더에 접근할 권한이 없습니다.' };
  }

  if (error instanceof TypeError) {
    return { code: 'INVALID_INPUT', message: error.message };
  }

  return { code: 'UNKNOWN_ERROR', message: error?.message || '알 수 없는 desktop 오류가 발생했습니다.' };
}

function handleDesktopIpc(channel, handler) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const data = await handler(...args);
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: toDesktopError(error) };
    }
  });
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
  await mainWindow.loadURL(`${url}/desktop#/`);
}

async function chooseContentRoot() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: desktopConfig.contentRoot || undefined,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return desktopConfig.contentRoot;
  }

  const contentRoot = result.filePaths[0];
  setContentRoot(contentRoot);
  return contentRoot;
}

function openRecentContentRoot(contentRoot) {
  if (!contentRoot) {
    return desktopConfig.contentRoot;
  }

  if (!fs.existsSync(contentRoot)) {
    desktopConfig.recentContentRoots = desktopConfig.recentContentRoots.filter((item) => item !== contentRoot);
    writeConfig(desktopConfig);
    const error = new Error('파일이나 폴더를 찾을 수 없습니다.');
    error.code = 'ENOENT';
    throw error;
  }

  setContentRoot(contentRoot);
  return contentRoot;
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
}

function sendDesktopCommand(command, payload = null) {
  focusMainWindow();
  emitDesktopEvent('markdeck:command', {
    command,
    payload,
    issuedAt: new Date().toISOString(),
  });
}

async function executeDesktopCommand(command, payload = null) {
  switch (command) {
    case 'open-content-root':
      return chooseContentRoot();
    case 'open-recent-content-root':
      return openRecentContentRoot(payload?.contentRoot || payload);
    case 'reload-content':
      emitContentInvalidated(null, 'manual-refresh');
      return true;
    case 'go-home':
    case 'go-browse':
    case 'go-search':
    case 'focus-search':
    case 'go-back':
    case 'go-forward':
    case 'toggle-theme':
    case 'toggle-command-palette':
      sendDesktopCommand(command, payload);
      return true;
    default:
      throw new TypeError(`Unknown desktop command: ${command}`);
  }
}

function buildRecentFoldersSubmenu() {
  const recentFolders = getRecentContentRoots();

  if (recentFolders.length === 0) {
    return [{ label: '최근 폴더 없음', enabled: false }];
  }

  return recentFolders.map((contentRoot) => ({
    label: contentRoot,
    click: () => void openRecentContentRoot(contentRoot),
  }));
}

function rebuildApplicationMenu() {
  const template = [
    {
      label: 'MarkDeck',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => void executeDesktopCommand('toggle-command-palette'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder…',
          accelerator: 'CmdOrCtrl+O',
          click: () => void executeDesktopCommand('open-content-root'),
        },
        {
          label: 'Open Recent',
          submenu: buildRecentFoldersSubmenu(),
        },
        { type: 'separator' },
        {
          label: 'Refresh Content',
          accelerator: 'CmdOrCtrl+R',
          click: () => void executeDesktopCommand('reload-content'),
        },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+1',
          click: () => void executeDesktopCommand('go-home'),
        },
        {
          label: 'Browse',
          accelerator: 'CmdOrCtrl+2',
          click: () => void executeDesktopCommand('go-browse'),
        },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+3',
          click: () => void executeDesktopCommand('go-search'),
        },
        { type: 'separator' },
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => void executeDesktopCommand('go-back'),
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => void executeDesktopCommand('go-forward'),
        },
        {
          label: 'Focus Search',
          accelerator: 'CmdOrCtrl+K',
          click: () => void executeDesktopCommand('focus-search'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => void executeDesktopCommand('toggle-theme'),
        },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

handleDesktopIpc('markdeck:get-content-root', () => getConfiguredContentRoot());
handleDesktopIpc('markdeck:get-recent-content-roots', () => getRecentContentRoots());
handleDesktopIpc('markdeck:choose-content-root', chooseContentRoot);
handleDesktopIpc('markdeck:open-recent-content-root', (contentRoot) => openRecentContentRoot(contentRoot));
handleDesktopIpc('markdeck:list-directory', (relativePath = '') => listDirectory(relativePath));
handleDesktopIpc('markdeck:build-document-tree', (relativePath = '', depth = 2) => buildDocumentTree(relativePath, depth));
handleDesktopIpc('markdeck:read-markdown-document', (relativePath) => readMarkdownDocument(relativePath));
handleDesktopIpc('markdeck:collect-markdown-relative-paths', () => collectMarkdownRelativePaths());
handleDesktopIpc('markdeck:search-markdown-documents', (query) => searchMarkdownDocuments(query));
handleDesktopIpc('markdeck:get-search-status', () => getSearchStatus());
handleDesktopIpc('markdeck:read-asset', (relativePath) => readAsset(relativePath));
handleDesktopIpc('markdeck:execute-command', (command, payload = null) => executeDesktopCommand(command, payload));

app.whenReady().then(async () => {
  rebuildApplicationMenu();
  restartContentWatcher();
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
  closeContentWatcher();

  if (webProcess) {
    webProcess.kill();
  }
});
