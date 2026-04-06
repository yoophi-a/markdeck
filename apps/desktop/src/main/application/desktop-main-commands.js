const { DESKTOP_COMMANDS, normalizeDesktopCommandPayload } = require('../core/desktop-contracts');

function createDesktopMainCommands({ contentRootUseCases, contentRefresh, launchTargetUseCases }) {
  function execute(command, payload = null) {
    const normalizedPayload = normalizeDesktopCommandPayload(command, payload);

    switch (command) {
      case 'open-content-root':
        return contentRootUseCases.chooseContentRoot();
      case 'open-recent-content-root':
        return contentRootUseCases.openRecentContentRoot(normalizedPayload?.contentRoot || normalizedPayload);
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
        launchTargetUseCases.sendDesktopCommand(command, normalizedPayload);
        return true;
      default:
        throw new TypeError(`Unknown desktop command: ${command}`);
    }
  }

  return {
    execute,
    getSupportedCommands() {
      return [...DESKTOP_COMMANDS];
    },
  };
}

module.exports = {
  createDesktopMainCommands,
};
