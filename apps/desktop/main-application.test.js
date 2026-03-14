const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

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
    snapshot() {
      return this.read();
    },
  };
}

function createHarness(options = {}) {
  const emittedEvents = [];
  const focusedWindows = [];
  const handledIpc = new Map();
  const scheduledReloads = [];
  const restartCalls = [];
  const invalidatedPaths = [];
  const invalidateAllCalls = [];
  const menuBuildCalls = [];
  const menuSetCalls = [];
  const pathExistsCalls = [];
  const resolvePathCalls = [];
  const chooseDirectoryCalls = [];
  const canApplyTargetNow = options.canApplyTargetNow ?? (() => true);
  const chooseDirectory = options.chooseDirectory ?? (async () => ({ canceled: true, filePaths: [] }));
  const pathExists = options.pathExists ?? (() => true);
  const resolvedPaths = options.resolvedPaths ?? {};
  const configStore = createConfigStore(options.initialConfig);

  const shell = {
    emitEvent(channel, payload) {
      emittedEvents.push({ channel, payload });
    },
    focusMainWindow() {
      focusedWindows.push('focused');
    },
    handleIpc(channel, handler) {
      handledIpc.set(channel, handler);
    },
    async chooseDirectory(args) {
      chooseDirectoryCalls.push(args);
      return chooseDirectory(args);
    },
    resolvePath(targetPath) {
      resolvePathCalls.push(targetPath);
      return resolvedPaths[targetPath] ?? path.resolve(targetPath);
    },
    canApplyTargetNow,
  };

  const watcher = {
    scheduleReload(callback) {
      scheduledReloads.push(callback);
    },
    restart(args) {
      restartCalls.push(args);
    },
    close() {
      restartCalls.push({ closed: true });
    },
  };

  const menuAdapter = {
    buildTemplate(args) {
      menuBuildCalls.push(args);
      return { kind: 'menu-template', recentContentRoots: [...args.recentContentRoots] };
    },
    set(template) {
      menuSetCalls.push(template);
    },
  };

  delete require.cache[require.resolve('./main/application/create-desktop-main-service')];
  const { createDesktopMainService } = require('./main/application/create-desktop-main-service');
  const service = createDesktopMainService({
    env: options.env ?? {},
    configStore,
    shell,
    watcher,
    menuAdapter,
  });

  return {
    service,
    configStore,
    emittedEvents,
    focusedWindows,
    handledIpc,
    scheduledReloads,
    restartCalls,
    invalidatedPaths,
    invalidateAllCalls,
    menuBuildCalls,
    menuSetCalls,
    pathExistsCalls,
    resolvePathCalls,
    chooseDirectoryCalls,
    flushScheduledReload(index = 0) {
      scheduledReloads[index]?.();
    },
  };
}

function installContentRepositorySpies(t, behavior = {}) {
  const repositoryModule = require('./main/adapters/node/content-repository');
  const originalFactory = repositoryModule.createContentRepository;
  const state = {
    invalidateAllCalls: 0,
    invalidatedPaths: [],
    normalizeRelativePathCalls: [],
    pathExistsCalls: [],
  };

  repositoryModule.createContentRepository = () => ({
    invalidateAllCaches() {
      state.invalidateAllCalls += 1;
    },
    invalidateCachesForPath(relativePath) {
      state.invalidatedPaths.push(relativePath);
    },
    normalizeRelativePath(relativePath) {
      state.normalizeRelativePathCalls.push(relativePath);
      return behavior.normalizeRelativePath ? behavior.normalizeRelativePath(relativePath) : relativePath;
    },
    pathExists(targetPath) {
      state.pathExistsCalls.push(targetPath);
      return behavior.pathExists ? behavior.pathExists(targetPath) : true;
    },
    listDirectory: behavior.listDirectory ?? (async () => []),
    buildDocumentTree: behavior.buildDocumentTree ?? (async () => []),
    readMarkdownDocument: behavior.readMarkdownDocument ?? (async () => null),
    collectMarkdownRelativePaths: behavior.collectMarkdownRelativePaths ?? (async () => []),
    searchMarkdownDocuments: behavior.searchMarkdownDocuments ?? (async () => []),
    getSearchStatus: behavior.getSearchStatus ?? (async () => ({ documentCount: 0, generatedAt: null, cachedQueryCount: 0 })),
    readAsset: behavior.readAsset ?? (async () => null),
  });

  t.after(() => {
    repositoryModule.createContentRepository = originalFactory;
  });

  return state;
}

test('createDesktopMainService registers IPC handlers for key desktop application use cases', (t) => {
  installContentRepositorySpies(t);
  const harness = createHarness({ initialConfig: { contentRoot: '/docs', recentContentRoots: ['/docs'] } });

  harness.service.registerIpcHandlers();

  assert.deepEqual([...harness.handledIpc.keys()].sort(), [
    'markdeck:build-document-tree',
    'markdeck:choose-content-root',
    'markdeck:collect-markdown-relative-paths',
    'markdeck:execute-command',
    'markdeck:get-content-root',
    'markdeck:get-recent-content-roots',
    'markdeck:get-search-status',
    'markdeck:list-directory',
    'markdeck:open-recent-content-root',
    'markdeck:read-asset',
    'markdeck:read-markdown-document',
    'markdeck:search-markdown-documents',
  ]);
});

test('launch handling applies markdown-file targets by updating content root and issuing open command', (t) => {
  const repositoryState = installContentRepositorySpies(t);
  const harness = createHarness({ initialConfig: { contentRoot: null, recentContentRoots: ['/old'] } });
  const target = {
    contentRoot: '/workspace/docs',
    relativeDocumentPath: 'guide.md',
    sourcePath: '/workspace/docs/guide.md',
    targetType: 'markdown-file',
  };

  assert.equal(harness.service.queueOrApplyLaunchTarget(target), true);

  assert.equal(harness.configStore.snapshot().contentRoot, path.resolve('/workspace/docs'));
  assert.deepEqual(harness.configStore.snapshot().recentContentRoots, [path.resolve('/workspace/docs'), path.resolve('/old')]);
  assert.equal(repositoryState.invalidateAllCalls, 1);
  assert.equal(harness.restartCalls.length, 1);
  assert.equal(harness.menuBuildCalls.length, 1);
  assert.equal(harness.menuSetCalls.length, 1);
  assert.equal(harness.focusedWindows.length, 1);
  assert.deepEqual(
    harness.emittedEvents.map((event) => event.channel),
    ['markdeck:content-root-changed', 'markdeck:command']
  );
  assert.equal(harness.emittedEvents[1].payload.command, 'open-launch-target');
  assert.deepEqual(harness.emittedEvents[1].payload.payload, target);
});

test('setContentRoot flow merges recents, restarts watcher, and broadcasts browse command for directory launches', (t) => {
  const repositoryState = installContentRepositorySpies(t);
  const harness = createHarness({ initialConfig: { contentRoot: '/existing', recentContentRoots: ['/existing', '/older'] } });

  assert.equal(
    harness.service.queueOrApplyLaunchTarget({
      contentRoot: '/next-root',
      relativeDocumentPath: null,
      sourcePath: '/next-root',
      targetType: 'directory',
    }),
    true
  );

  assert.deepEqual(harness.configStore.snapshot().recentContentRoots, [path.resolve('/next-root'), path.resolve('/existing'), path.resolve('/older')]);
  assert.equal(repositoryState.invalidateAllCalls, 1);
  assert.equal(harness.restartCalls.length, 1);
  assert.equal(harness.emittedEvents[1].payload.command, 'go-browse');
});

test('openRecentContentRoot removes missing roots from recents and raises a not-found error', async (t) => {
  const repositoryState = installContentRepositorySpies(t, {
    pathExists(targetPath) {
      return targetPath !== '/missing-root';
    },
  });
  const harness = createHarness({
    initialConfig: { contentRoot: '/docs', recentContentRoots: ['/docs', '/missing-root', '/older'] },
  });

  assert.throws(() => harness.service.openRecentContentRoot('/missing-root'), {
    code: 'ENOENT',
  });

  assert.deepEqual(repositoryState.pathExistsCalls, ['/missing-root']);
  assert.deepEqual(harness.configStore.snapshot().recentContentRoots, ['/docs', '/older']);
  assert.equal(harness.menuBuildCalls.length, 1);
  assert.equal(harness.menuSetCalls.length, 1);
});

test('watcher reload flow invalidates normalized paths and emits content invalidation events', (t) => {
  const repositoryState = installContentRepositorySpies(t, {
    normalizeRelativePath(relativePath) {
      return `normalized/${relativePath}`;
    },
  });
  const harness = createHarness({ initialConfig: { contentRoot: '/docs', recentContentRoots: ['/docs'] } });

  harness.service.restartContentWatcher();
  assert.equal(harness.restartCalls.length, 1);

  harness.restartCalls[0].onContentChanged('notes/guide.md');
  assert.equal(harness.scheduledReloads.length, 1);

  harness.flushScheduledReload();

  assert.deepEqual(repositoryState.normalizeRelativePathCalls, ['notes/guide.md']);
  assert.deepEqual(repositoryState.invalidatedPaths, ['normalized/notes/guide.md']);
  assert.equal(harness.emittedEvents[0].channel, 'markdeck:content-invalidated');
  assert.equal(harness.emittedEvents[0].payload.relativePath, 'normalized/notes/guide.md');
  assert.equal(harness.emittedEvents[0].payload.reason, 'watcher');
});

test('launch targets stay queued until the shell becomes ready, then apply the latest markdown target', (t) => {
  const repositoryState = installContentRepositorySpies(t);
  let ready = false;
  const harness = createHarness({
    initialConfig: { contentRoot: '/initial', recentContentRoots: ['/initial'] },
    canApplyTargetNow: () => ready,
  });
  const firstTarget = {
    contentRoot: '/queued-one',
    relativeDocumentPath: null,
    sourcePath: '/queued-one',
    targetType: 'directory',
  };
  const latestTarget = {
    contentRoot: '/queued-two',
    relativeDocumentPath: 'docs/guide.md',
    sourcePath: '/queued-two/docs/guide.md',
    targetType: 'markdown-file',
  };

  assert.equal(harness.service.queueOrApplyLaunchTarget(firstTarget), false);
  assert.equal(harness.service.queueOrApplyLaunchTarget(latestTarget), false);
  assert.equal(harness.emittedEvents.length, 0);

  ready = true;
  assert.equal(harness.service.applyPendingLaunchTarget(), true);

  assert.equal(harness.configStore.snapshot().contentRoot, path.resolve('/queued-two'));
  assert.equal(repositoryState.invalidateAllCalls, 1);
  assert.deepEqual(
    harness.emittedEvents.map((event) => event.channel),
    ['markdeck:content-root-changed', 'markdeck:command']
  );
  assert.equal(harness.emittedEvents[1].payload.command, 'open-launch-target');
  assert.deepEqual(harness.emittedEvents[1].payload.payload, latestTarget);
});

test('chooseContentRoot updates config, recents, watcher, and emits a content-root change when a folder is selected', async (t) => {
  const repositoryState = installContentRepositorySpies(t);
  const harness = createHarness({
    initialConfig: { contentRoot: '/initial', recentContentRoots: ['/older'] },
    chooseDirectory: async () => ({ canceled: false, filePaths: ['/picked/root'] }),
  });

  const selected = await harness.service.executeDesktopCommand('open-content-root');

  assert.equal(selected, '/picked/root');
  assert.equal(harness.configStore.snapshot().contentRoot, path.resolve('/picked/root'));
  assert.deepEqual(harness.configStore.snapshot().recentContentRoots, [path.resolve('/picked/root'), path.resolve('/older')]);
  assert.equal(repositoryState.invalidateAllCalls, 1);
  assert.equal(harness.restartCalls.length, 1);
  assert.equal(harness.emittedEvents.length, 1);
  assert.equal(harness.emittedEvents[0].channel, 'markdeck:content-root-changed');
  assert.equal(harness.emittedEvents[0].payload.contentRoot, path.resolve('/picked/root'));
});

test('openRecentContentRoot refreshes the active root and watcher for valid recent folders', (t) => {
  const repositoryState = installContentRepositorySpies(t, {
    pathExists(targetPath) {
      return targetPath === '/recent/docs';
    },
  });
  const harness = createHarness({
    initialConfig: { contentRoot: '/initial', recentContentRoots: ['/recent/docs', '/older'] },
  });

  const opened = harness.service.openRecentContentRoot('/recent/docs');

  assert.equal(opened, '/recent/docs');
  assert.equal(harness.configStore.snapshot().contentRoot, path.resolve('/recent/docs'));
  assert.deepEqual(harness.configStore.snapshot().recentContentRoots, [path.resolve('/recent/docs'), path.resolve('/older')]);
  assert.deepEqual(repositoryState.pathExistsCalls, ['/recent/docs']);
  assert.equal(repositoryState.invalidateAllCalls, 1);
  assert.equal(harness.restartCalls.length, 1);
  assert.equal(harness.emittedEvents[0].channel, 'markdeck:content-root-changed');
});

test('watcher error reload invalidates all content and restarts the watcher', (t) => {
  const repositoryState = installContentRepositorySpies(t);
  const harness = createHarness({ initialConfig: { contentRoot: '/docs', recentContentRoots: ['/docs'] } });

  harness.service.restartContentWatcher();
  harness.restartCalls[0].onError();

  assert.equal(harness.scheduledReloads.length, 1);
  harness.flushScheduledReload();

  assert.deepEqual(repositoryState.invalidatedPaths, [null]);
  assert.equal(harness.emittedEvents[0].channel, 'markdeck:content-invalidated');
  assert.equal(harness.emittedEvents[0].payload.relativePath, null);
  assert.equal(harness.emittedEvents[0].payload.reason, 'watcher-error');
  assert.equal(harness.restartCalls.length, 2);
});

test('watcher change events with blank filenames trigger a full invalidation instead of a path-specific refresh', (t) => {
  const repositoryState = installContentRepositorySpies(t);
  const harness = createHarness({ initialConfig: { contentRoot: '/docs', recentContentRoots: ['/docs'] } });

  harness.service.restartContentWatcher();
  harness.restartCalls[0].onContentChanged('   ');
  harness.flushScheduledReload();

  assert.deepEqual(repositoryState.normalizeRelativePathCalls, []);
  assert.deepEqual(repositoryState.invalidatedPaths, [null]);
  assert.equal(harness.emittedEvents[0].payload.relativePath, null);
  assert.equal(harness.emittedEvents[0].payload.reason, 'watcher');
});

test('createDesktopMainService validates required application ports up front', (t) => {
  installContentRepositorySpies(t);
  delete require.cache[require.resolve('./main/application/create-desktop-main-service')];
  const { createDesktopMainService } = require('./main/application/create-desktop-main-service');

  assert.throws(
    () =>
      createDesktopMainService({
        configStore: { read() { return {}; } },
        shell: {
          canApplyTargetNow() { return true; },
          emitEvent() {},
          focusMainWindow() {},
          handleIpc() {},
          chooseDirectory: async () => ({ canceled: true, filePaths: [] }),
          resolvePath(value) { return value; },
        },
        watcher: {
          scheduleReload() {},
          restart() {},
          close() {},
        },
        menuAdapter: {
          buildTemplate() { return []; },
          set() {},
        },
      }),
    {
      name: 'TypeError',
      message: 'Expected configStore.write to be a function',
    }
  );
});
