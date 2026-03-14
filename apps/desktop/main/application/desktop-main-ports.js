const REQUIRED_CONFIG_STORE_METHODS = ['read', 'write'];
const REQUIRED_SHELL_METHODS = ['canApplyTargetNow', 'emitEvent', 'focusMainWindow', 'handleIpc', 'chooseDirectory', 'resolvePath'];
const REQUIRED_WATCHER_METHODS = ['scheduleReload', 'restart', 'close'];
const REQUIRED_MENU_ADAPTER_METHODS = ['buildTemplate', 'set'];

function assertPortMethods(portName, value, methodNames) {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`Expected ${portName} port to be an object`);
  }

  for (const methodName of methodNames) {
    if (typeof value[methodName] !== 'function') {
      throw new TypeError(`Expected ${portName}.${methodName} to be a function`);
    }
  }
}

function createDesktopMainPorts({ configStore, shell, watcher, menuAdapter }) {
  assertPortMethods('configStore', configStore, REQUIRED_CONFIG_STORE_METHODS);
  assertPortMethods('shell', shell, REQUIRED_SHELL_METHODS);
  assertPortMethods('watcher', watcher, REQUIRED_WATCHER_METHODS);
  assertPortMethods('menuAdapter', menuAdapter, REQUIRED_MENU_ADAPTER_METHODS);

  return {
    configStore,
    shell,
    watcher,
    menuAdapter,
  };
}

module.exports = {
  REQUIRED_CONFIG_STORE_METHODS,
  REQUIRED_MENU_ADAPTER_METHODS,
  REQUIRED_SHELL_METHODS,
  REQUIRED_WATCHER_METHODS,
  createDesktopMainPorts,
};
