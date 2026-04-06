const { Menu } = require('electron');
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
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    },
  };
}

module.exports = {
  createElectronMenuAdapter,
};
