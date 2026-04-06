const { getConfiguredContentRoot, getIgnorePatterns, getRecentContentRoots } = require('../core/desktop-core');
const { createContentRepository } = require('../infrastructure/node/create-content-repository');
const { createDesktopMainPorts } = require('../core/ports/create-desktop-main-ports');
const { createContentRootUseCases } = require('./content-root-use-cases');
const { createContentRefreshOrchestrator } = require('./content-refresh-orchestrator');
const { createLaunchTargetUseCases } = require('./launch-target-use-cases');
const { createDesktopMainCommands } = require('./desktop-main-commands');
const { createDesktopMainQueries } = require('./desktop-main-queries');
const { normalizeDesktopError } = require('../core/desktop-contracts');

function createMarkdeckDesktopService({ env = process.env, configStore, shell, watcher, menuAdapter }) {
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

  const commands = createDesktopMainCommands({
    contentRootUseCases,
    contentRefresh,
    launchTargetUseCases,
  });

  const queries = createDesktopMainQueries({
    getConfiguredDesktopContentRoot,
    getDesktopRecentContentRoots,
    contentRepository,
  });

  function rebuildApplicationMenu() {
    const template = menuAdapterPort.buildTemplate({
      recentContentRoots: queries.getRecentContentRoots(),
      onCommand: commands.execute,
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
        return { ok: false, error: normalizeDesktopError(error) };
      }
    });
  }

  function registerIpcHandlers() {
    handleDesktopIpc('markdeck:get-content-root', queries.getContentRoot);
    handleDesktopIpc('markdeck:get-recent-content-roots', queries.getRecentContentRoots);
    handleDesktopIpc('markdeck:choose-content-root', contentRootUseCases.chooseContentRoot);
    handleDesktopIpc('markdeck:open-recent-content-root', (contentRoot) => contentRootUseCases.openRecentContentRoot(contentRoot));
    handleDesktopIpc('markdeck:list-directory', queries.listDirectory);
    handleDesktopIpc('markdeck:build-document-tree', queries.buildDocumentTree);
    handleDesktopIpc('markdeck:read-markdown-document', queries.readMarkdownDocument);
    handleDesktopIpc('markdeck:collect-markdown-relative-paths', queries.collectMarkdownRelativePaths);
    handleDesktopIpc('markdeck:search-markdown-documents', queries.searchMarkdownDocuments);
    handleDesktopIpc('markdeck:get-search-status', queries.getSearchStatus);
    handleDesktopIpc('markdeck:read-asset', queries.readAsset);
    handleDesktopIpc('markdeck:execute-command', commands.execute);
  }

  function shutdown() {
    watcherPort.close();
  }

  return {
    applyPendingLaunchTarget: launchTargetUseCases.applyPendingLaunchTarget,
    executeDesktopCommand: commands.execute,
    getConfiguredDesktopContentRoot: queries.getContentRoot,
    getDesktopRecentContentRoots: queries.getRecentContentRoots,
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
  createMarkdeckDesktopService,
};
