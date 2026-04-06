const { mergeRecentContentRoots } = require('../core/desktop-core');

function createContentRootUseCases({ desktopConfigRef, shell, contentRepository, writeConfig, restartContentWatcher, emitDesktopEvent }) {
  function getDesktopConfig() {
    return desktopConfigRef.get();
  }

  function setContentRoot(contentRoot) {
    const desktopConfig = getDesktopConfig();
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

  async function chooseContentRoot() {
    const desktopConfig = getDesktopConfig();
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
      return getDesktopConfig().contentRoot;
    }

    if (!contentRepository.pathExists(contentRoot)) {
      const desktopConfig = getDesktopConfig();
      desktopConfig.recentContentRoots = desktopConfig.recentContentRoots.filter((item) => item !== contentRoot);
      writeConfig(desktopConfig);
      const error = new Error('파일이나 폴더를 찾을 수 없습니다.');
      error.code = 'ENOENT';
      throw error;
    }

    setContentRoot(contentRoot);
    return contentRoot;
  }

  return {
    chooseContentRoot,
    openRecentContentRoot,
    setContentRoot,
  };
}

module.exports = {
  createContentRootUseCases,
};
