const { createLaunchTargetCoordinator, getConfiguredContentRoot, getIgnorePatterns, getRecentContentRoots, mergeRecentContentRoots } = require('../core/desktop-core');
const { createContentRepository } = require('../adapters/node/content-repository');

function createDesktopMainService({ env = process.env, configStore, shell, watcher, menuAdapter }) {
  let desktopConfig = configStore.read();

  function writeConfig(nextConfig) {
    desktopConfig = configStore.write(nextConfig);
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
    shell.emitEvent(channel, payload);
  }

  function focusMainWindow() {
    shell.focusMainWindow();
  }

  function sendDesktopCommand(command, payload = null) {
    focusMainWindow();
    emitDesktopEvent('markdeck:command', {
      command,
      payload,
      issuedAt: new Date().toISOString(),
    });
  }

  function setContentRoot(contentRoot) {
    const normalizedRoot = contentRoot ? shell.resolvePath(contentRoot) : null;
    const recentContentRoots = mergeRecentContentRoots(desktopConfig.recentContentRoots, normalizedRoot);

    writeConfig({
      ...desktopConfig,
      contentRoot: normalizedRoot,
      recentContentRoots,
    });

    contentRepository.invalidateAllCaches();
    restartContentWatcher();
    emitDesktopEvent('markdeck:content-root-changed', {
      contentRoot: normalizedRoot,
      recentContentRoots,
    });
  }

  function applyLaunchTarget(target) {
    if (!target?.contentRoot) {
      return false;
    }

    setContentRoot(target.contentRoot);

    if (target.relativeDocumentPath) {
      sendDesktopCommand('open-launch-target', {
        contentRoot: target.contentRoot,
        relativeDocumentPath: target.relativeDocumentPath,
        sourcePath: target.sourcePath,
        targetType: target.targetType,
      });
      return true;
    }

    sendDesktopCommand('go-browse');
    return true;
  }

  const launchTargetCoordinator = createLaunchTargetCoordinator({
    applyLaunchTarget,
    canApplyTargetNow: () => shell.canApplyTargetNow(),
  });

  function emitContentInvalidated(relativePath = null, reason = 'unknown') {
    contentRepository.invalidateCachesForPath(relativePath);
    emitDesktopEvent('markdeck:content-invalidated', {
      relativePath,
      reason,
      contentRoot: getConfiguredDesktopContentRoot(),
      changedAt: new Date().toISOString(),
    });
  }

  function scheduleContentReload(relativePath, reason) {
    watcher.scheduleReload(() => {
      emitContentInvalidated(relativePath, reason);
    });
  }

  function restartContentWatcher() {
    watcher.restart({
      contentRoot: getConfiguredDesktopContentRoot(),
      onContentChanged: (filename) => {
        const relativePath = typeof filename === 'string' && filename.trim() ? contentRepository.normalizeRelativePath(filename) : null;
        scheduleContentReload(relativePath, 'watcher');
      },
      onError: () => {
        scheduleContentReload(null, 'watcher-error');
        restartContentWatcher();
      },
    });
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

  async function chooseContentRoot() {
    const result = await shell.chooseDirectory({
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

    if (!contentRepository.pathExists(contentRoot)) {
      desktopConfig.recentContentRoots = desktopConfig.recentContentRoots.filter((item) => item !== contentRoot);
      writeConfig(desktopConfig);
      const error = new Error('파일이나 폴더를 찾을 수 없습니다.');
      error.code = 'ENOENT';
      throw error;
    }

    setContentRoot(contentRoot);
    return contentRoot;
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

  function rebuildApplicationMenu() {
    const template = menuAdapter.buildTemplate({
      recentContentRoots: getDesktopRecentContentRoots(),
      onCommand: executeDesktopCommand,
      onOpenRecentContentRoot: openRecentContentRoot,
    });
    menuAdapter.set(template);
  }

  function handleDesktopIpc(channel, handler) {
    shell.handleIpc(channel, async (...args) => {
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
    handleDesktopIpc('markdeck:choose-content-root', chooseContentRoot);
    handleDesktopIpc('markdeck:open-recent-content-root', (contentRoot) => openRecentContentRoot(contentRoot));
    handleDesktopIpc('markdeck:list-directory', (relativePath = '') => contentRepository.listDirectory(relativePath));
    handleDesktopIpc('markdeck:build-document-tree', (relativePath = '', depth = 2) => contentRepository.buildDocumentTree(relativePath, depth));
    handleDesktopIpc('markdeck:read-markdown-document', (relativePath) => contentRepository.readMarkdownDocument(relativePath));
    handleDesktopIpc('markdeck:collect-markdown-relative-paths', () => contentRepository.collectMarkdownRelativePaths());
    handleDesktopIpc('markdeck:search-markdown-documents', (query) => contentRepository.searchMarkdownDocuments(query));
    handleDesktopIpc('markdeck:get-search-status', () => contentRepository.getSearchStatus());
    handleDesktopIpc('markdeck:read-asset', (relativePath) => contentRepository.readAsset(relativePath));
    handleDesktopIpc('markdeck:execute-command', (command, payload = null) => executeDesktopCommand(command, payload));
  }

  function setPendingLaunchTarget(target) {
    launchTargetCoordinator.setPendingLaunchTarget(target);
  }

  function queueOrApplyLaunchTarget(target) {
    return launchTargetCoordinator.queueOrApplyLaunchTarget(target);
  }

  function applyPendingLaunchTarget() {
    return launchTargetCoordinator.applyPendingLaunchTarget();
  }

  function shutdown() {
    watcher.close();
  }

  return {
    applyPendingLaunchTarget,
    executeDesktopCommand,
    getConfiguredDesktopContentRoot,
    getDesktopRecentContentRoots,
    openRecentContentRoot,
    queueOrApplyLaunchTarget,
    rebuildApplicationMenu,
    registerIpcHandlers,
    restartContentWatcher,
    setPendingLaunchTarget,
    shutdown,
  };
}

module.exports = {
  createDesktopMainService,
};
