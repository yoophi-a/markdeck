function buildApplicationMenuTemplate({ isDev, recentContentRoots, onCommand, onOpenRecentContentRoot }) {
  const recentFoldersSubmenu =
    recentContentRoots.length === 0
      ? [{ label: '최근 폴더 없음', enabled: false }]
      : recentContentRoots.map((contentRoot) => ({
          label: contentRoot,
          click: () => void onOpenRecentContentRoot(contentRoot),
        }));

  return [
    {
      label: 'MarkDeck',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => void onCommand('toggle-command-palette'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder…',
          accelerator: 'CmdOrCtrl+O',
          click: () => void onCommand('open-content-root'),
        },
        {
          label: 'Open Recent',
          submenu: recentFoldersSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Refresh Content',
          accelerator: 'CmdOrCtrl+R',
          click: () => void onCommand('reload-content'),
        },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+1',
          click: () => void onCommand('go-home'),
        },
        {
          label: 'Browse',
          accelerator: 'CmdOrCtrl+2',
          click: () => void onCommand('go-browse'),
        },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+3',
          click: () => void onCommand('go-search'),
        },
        { type: 'separator' },
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => void onCommand('go-back'),
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => void onCommand('go-forward'),
        },
        {
          label: 'Focus Search',
          accelerator: 'CmdOrCtrl+K',
          click: () => void onCommand('focus-search'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => void onCommand('toggle-theme'),
        },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
  ];
}

module.exports = {
  buildApplicationMenuTemplate,
};
