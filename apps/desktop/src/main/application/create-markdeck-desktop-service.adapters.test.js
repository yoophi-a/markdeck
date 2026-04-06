const test = require('node:test');
const assert = require('node:assert/strict');

function createConfigStore(initialConfig = {}) {
  let currentConfig = {
    contentRoot: initialConfig.contentRoot ?? null,
    recentContentRoots: [...(initialConfig.recentContentRoots ?? [])],
  };

  return {
    read() {
      return {
        contentRoot: currentConfig.contentRoot,
        recentContentRoots: [...currentConfig.recentContentRoots],
      };
    },
    write(nextConfig) {
      currentConfig = {
        contentRoot: nextConfig.contentRoot ?? null,
        recentContentRoots: [...(nextConfig.recentContentRoots ?? [])],
      };
      return this.read();
    },
  };
}

function installContentRepositoryMock(t, overrides = {}) {
  const repositoryModule = require('../infrastructure/node/create-content-repository');
  const originalFactory = repositoryModule.createContentRepository;
  const state = {
    listDirectoryCalls: [],
    readMarkdownDocumentCalls: [],
    readAssetCalls: [],
  };

  repositoryModule.createContentRepository = () => ({
    invalidateAllCaches() {},
    invalidateCachesForPath() {},
    normalizeRelativePath(relativePath) {
      return relativePath;
    },
    pathExists() {
      return true;
    },
    async listDirectory(relativePath = '') {
      state.listDirectoryCalls.push(relativePath);
      if (overrides.listDirectory) {
        return overrides.listDirectory(relativePath);
      }
      return [];
    },
    async buildDocumentTree(relativePath = '', depth = 2) {
      return overrides.buildDocumentTree ? overrides.buildDocumentTree(relativePath, depth) : [];
    },
    async readMarkdownDocument(relativePath) {
      state.readMarkdownDocumentCalls.push(relativePath);
      if (overrides.readMarkdownDocument) {
        return overrides.readMarkdownDocument(relativePath);
      }
      return { relativePath, content: '# ok' };
    },
    async collectMarkdownRelativePaths() {
      return overrides.collectMarkdownRelativePaths ? overrides.collectMarkdownRelativePaths() : [];
    },
    async searchMarkdownDocuments(query) {
      return overrides.searchMarkdownDocuments ? overrides.searchMarkdownDocuments(query) : [];
    },
    async getSearchStatus() {
      return overrides.getSearchStatus ? overrides.getSearchStatus() : { documentCount: 0, generatedAt: null, cachedQueryCount: 0 };
    },
    async readAsset(relativePath) {
      state.readAssetCalls.push(relativePath);
      if (overrides.readAsset) {
        return overrides.readAsset(relativePath);
      }
      return { relativePath, contentType: 'text/plain', dataBase64: '', size: 0 };
    },
  });

  t.after(() => {
    repositoryModule.createContentRepository = originalFactory;
  });

  return state;
}

function createServiceHarness(options = {}) {
  const handledIpc = new Map();
  const emittedEvents = [];
  const menuBuildCalls = [];
  const menuSetCalls = [];
  const chooseDirectoryCalls = [];
  const configStore = createConfigStore(options.initialConfig);

  const shell = {
    emitEvent(channel, payload) {
      emittedEvents.push({ channel, payload });
    },
    focusMainWindow() {},
    handleIpc(channel, handler) {
      handledIpc.set(channel, handler);
    },
    async chooseDirectory(args) {
      chooseDirectoryCalls.push(args);
      return options.chooseDirectory ? options.chooseDirectory(args) : { canceled: true, filePaths: [] };
    },
    resolvePath(targetPath) {
      return targetPath;
    },
    canApplyTargetNow() {
      return true;
    },
  };

  const watcher = {
    scheduleReload() {},
    restart() {},
    close() {},
  };

  const menuAdapter = {
    buildTemplate(args) {
      menuBuildCalls.push(args);
      return { template: 'menu', recentContentRoots: [...args.recentContentRoots] };
    },
    set(template) {
      menuSetCalls.push(template);
    },
  };

  delete require.cache[require.resolve('./create-markdeck-desktop-service')];
  const { createMarkdeckDesktopService } = require('./create-markdeck-desktop-service');
  const service = createMarkdeckDesktopService({
    env: options.env ?? {},
    configStore,
    shell,
    watcher,
    menuAdapter,
  });

  return {
    service,
    handledIpc,
    emittedEvents,
    menuBuildCalls,
    menuSetCalls,
    chooseDirectoryCalls,
  };
}

test('menu adapter receives recent roots and executable callbacks from the application service', (t) => {
  installContentRepositoryMock(t);
  const harness = createServiceHarness({
    initialConfig: {
      contentRoot: '/docs/current',
      recentContentRoots: ['/docs/older'],
    },
  });

  harness.service.rebuildApplicationMenu();

  assert.equal(harness.menuBuildCalls.length, 1);
  assert.deepEqual(harness.menuBuildCalls[0].recentContentRoots, ['/docs/current', '/docs/older']);
  assert.equal(typeof harness.menuBuildCalls[0].onCommand, 'function');
  assert.equal(typeof harness.menuBuildCalls[0].onOpenRecentContentRoot, 'function');
  assert.deepEqual(harness.menuSetCalls, [{ template: 'menu', recentContentRoots: ['/docs/current', '/docs/older'] }]);
});

test('chooseContentRoot uses the shell directory picker and preserves current root when cancelled', async (t) => {
  installContentRepositoryMock(t);
  const harness = createServiceHarness({
    initialConfig: { contentRoot: '/docs/current', recentContentRoots: ['/docs/current'] },
    chooseDirectory: async () => ({ canceled: true, filePaths: [] }),
  });

  const selected = await harness.service.executeDesktopCommand('open-content-root');

  assert.equal(selected, '/docs/current');
  assert.deepEqual(harness.chooseDirectoryCalls, [{ defaultPath: '/docs/current' }]);
  assert.deepEqual(harness.emittedEvents, []);
});

test('IPC handlers translate repository unsafe-path and permission failures into desktop-safe errors', async (t) => {
  const repositoryState = installContentRepositoryMock(t, {
    readMarkdownDocument(relativePath) {
      if (relativePath === '../secret.md') {
        throw new Error('Unsafe path outside of content root');
      }

      const error = new Error('access denied');
      error.code = 'EACCES';
      throw error;
    },
    readAsset() {
      const error = new Error('blocked');
      error.code = 'EPERM';
      throw error;
    },
  });
  const harness = createServiceHarness({
    initialConfig: { contentRoot: '/docs/current', recentContentRoots: ['/docs/current'] },
  });

  harness.service.registerIpcHandlers();

  const unsafeResult = await harness.handledIpc.get('markdeck:read-markdown-document')('../secret.md');
  const markdownPermissionResult = await harness.handledIpc.get('markdeck:read-markdown-document')('guide.md');
  const assetPermissionResult = await harness.handledIpc.get('markdeck:read-asset')('image.png');

  assert.deepEqual(repositoryState.readMarkdownDocumentCalls, ['../secret.md', 'guide.md']);
  assert.deepEqual(repositoryState.readAssetCalls, ['image.png']);
  assert.deepEqual(unsafeResult, {
    ok: false,
    error: { code: 'UNSAFE_PATH', message: 'Unsafe path outside of content root' },
  });
  assert.deepEqual(markdownPermissionResult, {
    ok: false,
    error: { code: 'PERMISSION_DENIED', message: '파일이나 폴더에 접근할 권한이 없습니다.' },
  });
  assert.deepEqual(assetPermissionResult, {
    ok: false,
    error: { code: 'PERMISSION_DENIED', message: '파일이나 폴더에 접근할 권한이 없습니다.' },
  });
});

test('IPC execute-command wraps invalid commands as INVALID_INPUT without leaking exceptions', async (t) => {
  installContentRepositoryMock(t);
  const harness = createServiceHarness({
    initialConfig: { contentRoot: '/docs/current', recentContentRoots: ['/docs/current'] },
  });

  harness.service.registerIpcHandlers();

  const result = await harness.handledIpc.get('markdeck:execute-command')('unsupported-command');

  assert.deepEqual(result, {
    ok: false,
    error: { code: 'INVALID_INPUT', message: 'Unknown desktop command: unsupported-command' },
  });
});
