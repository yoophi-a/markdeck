const { buildApplicationMenuTemplate } = require('./application-menu');

function createElectronMenuAdapter({ isDev }) {
  return {
    buildTemplate({ recentContentRoots, onCommand, onOpenRecentContentRoot }) {
      return buildApplicationMenuTemplate({
        isDev,
        recentContentRoots,
        onCommand,
        onOpenRecentContentRoot,
      });
    },
    set(template) {
      const { Menu } = require('electron');
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    },
  };
}

module.exports = {
  createElectronMenuAdapter,
};
