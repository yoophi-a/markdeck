const { createLaunchTargetCoordinator } = require('../core/desktop-core');

function createLaunchTargetUseCases({ shell, setContentRoot, emitDesktopEvent }) {
  function sendDesktopCommand(command, payload = null) {
    shell.focusMainWindow();
    emitDesktopEvent('markdeck:command', {
      command,
      payload,
      issuedAt: new Date().toISOString(),
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

  const coordinator = createLaunchTargetCoordinator({
    applyLaunchTarget,
    canApplyTargetNow: () => shell.canApplyTargetNow(),
  });

  return {
    applyPendingLaunchTarget: () => coordinator.applyPendingLaunchTarget(),
    queueOrApplyLaunchTarget: (target) => coordinator.queueOrApplyLaunchTarget(target),
    setPendingLaunchTarget: (target) => coordinator.setPendingLaunchTarget(target),
    sendDesktopCommand,
  };
}

module.exports = {
  createLaunchTargetUseCases,
};
