const { getConfiguredContentRoot, getIgnorePatterns, getRecentContentRoots } = require('../core/desktop-core');
const { createContentRepository } = require('../adapters/node/content-repository');
const { createDesktopMainPorts } = require('./desktop-main-ports');
const { createContentRootUseCases } = require('./content-root-use-cases');
const { createContentRefreshOrchestrator } = require('./content-refresh-orchestrator');
const { createLaunchTargetUseCases } = require('./launch-target-use-cases');

function createDesktopMainService({ env = process.env, configStore, shell, watcher, menuAdapter }) {
  const ports = createDesktopMainPorts({ configStore, shell, watcher, menuAdapter });
  const { configStore: configStorePort, shell: shellPort, watcher: watcherPort, menuAdapter: menuAdapterPort } = ports;
  let desktopConfig = configStorePort.read();

  function getDesktopConfig() {
    return desktopConfig;
  }

  function writeConfig(nextConfig) {
    desktopConfig = configStorePort.write(nextConfig);
    rebuildApplicationMenu();
    return desktopConfig;
  }

  function getConfiguredDesktopContentRoot() {
    return getConfiguredContentRoot(desktopConfig, env);
  }

  function getDesktopRecentContentRoots() {
    return getRecentContentRoots(desktopConfig, env);
  }

  function getContentRoot() {
    const contentRoot = getConfiguredDesktopContentRoot();

    if (!contentRoot) {
      const error = new Error('Content root is not configured');
      error.code = 'CONTENT_ROOT_NOT_SET';
      throw error;
    }

    return contentRoot;
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
    return entryName.startsWith('.') || getIgnorePatterns(env).some((pattern) => matchesPattern(entryName, pattern));
  }

  const contentRepository = createContentRepository({
    getContentRoot,
    shouldIgnoreEntry,
  });

  function emitDesktopEvent(channel, payload) {
    shellPort.emitEvent(channel, payload);
  }

  const contentRefresh = createContentRefreshOrchestrator({
    getConfiguredDesktopContentRoot,
    contentRepository,
    watcher: watcherPort,
    emitDesktopEvent,
  });

  const contentRootUseCases = createContentRootUseCases({
    desktopConfigRef: { get: getDesktopConfig },
    shell: shellPort,
    contentRepository,
    writeConfig,
    restartContentWatcher: contentRefresh.restartContentWatcher,
    emitDesktopEvent,
  });

  const launchTargetUseCases = createLaunchTargetUseCases({
    shell: shellPort,
    setContentRoot: contentRootUseCases.setContentRoot,
    emitDesktopEvent,
  });

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

  async function executeDesktopCommand(command, payload = null) {
    switch (command) {
      case 'open-content-root':
        return contentRootUseCases.chooseContentRoot();
      case 'open-recent-content-root':
        return contentRootUseCases.openRecentContentRoot(payload?.contentRoot || payload);
      case 'reload-content':
        contentRefresh.emitContentInvalidated(null, 'manual-refresh');
        return true;
      case 'go-home':
      case 'go-browse':
      case 'go-search':
      case 'focus-search':
      case 'go-back':
      case 'go-forward':
      case 'toggle-theme':
      case 'toggle-command-palette':
        launchTargetUseCases.sendDesktopCommand(command, payload);
        return true;
      default:
        throw new TypeError(`Unknown desktop command: ${command}`);
    }
  }

  function rebuildApplicationMenu() {
    const template = menuAdapterPort.buildTemplate({
      recentContentRoots: getDesktopRecentContentRoots(),
      onCommand: executeDesktopCommand,
      onOpenRecentContentRoot: contentRootUseCases.openRecentContentRoot,
    });
    menuAdapterPort.set(template);
  }

  function handleDesktopIpc(channel, handler) {
    shellPort.handleIpc(channel, async (...args) => {
      try {
        const data = await handler(...args);
        return { ok: true, data };
      } catch (error) {
        return { ok: false, error: toDesktopError(error) };
      }
    });
  }

  function registerIpcHandlers() {
    handleDesktopIpc('markdeck:get-content-root', () => getConfiguredDesktopContentRoot());
    handleDesktopIpc('markdeck:get-recent-content-roots', () => getDesktopRecentContentRoots());
    handleDesktopIpc('markdeck:choose-content-root', contentRootUseCases.chooseContentRoot);
    handleDesktopIpc('markdeck:open-recent-content-root', (contentRoot) => contentRootUseCases.openRecentContentRoot(contentRoot));
    handleDesktopIpc('markdeck:list-directory', (relativePath = '') => contentRepository.listDirectory(relativePath));
    handleDesktopIpc('markdeck:build-document-tree', (relativePath = '', depth = 2) => contentRepository.buildDocumentTree(relativePath, depth));
    handleDesktopIpc('markdeck:read-markdown-document', (relativePath) => contentRepository.readMarkdownDocument(relativePath));
    handleDesktopIpc('markdeck:collect-markdown-relative-paths', () => contentRepository.collectMarkdownRelativePaths());
    handleDesktopIpc('markdeck:search-markdown-documents', (query) => contentRepository.searchMarkdownDocuments(query));
    handleDesktopIpc('markdeck:get-search-status', () => contentRepository.getSearchStatus());
    handleDesktopIpc('markdeck:read-asset', (relativePath) => contentRepository.readAsset(relativePath));
    handleDesktopIpc('markdeck:execute-command', (command, payload = null) => executeDesktopCommand(command, payload));
  }

  function shutdown() {
    watcherPort.close();
  }

  return {
    applyPendingLaunchTarget: launchTargetUseCases.applyPendingLaunchTarget,
    executeDesktopCommand,
    getConfiguredDesktopContentRoot,
    getDesktopRecentContentRoots,
    openRecentContentRoot: contentRootUseCases.openRecentContentRoot,
    queueOrApplyLaunchTarget: launchTargetUseCases.queueOrApplyLaunchTarget,
    rebuildApplicationMenu,
    registerIpcHandlers,
    restartContentWatcher: contentRefresh.restartContentWatcher,
    setPendingLaunchTarget: launchTargetUseCases.setPendingLaunchTarget,
    shutdown,
  };
}

module.exports = {
  createDesktopMainService,
};
