const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeDesktopCommandPayload,
  normalizeDesktopError,
  normalizeDirectoryPickerResult,
} = require('./main/application/desktop-main-contracts');
const { createDesktopMainPorts } = require('./main/application/desktop-main-ports');

test('desktop main ports normalize config snapshots and directory picker results', async () => {
  const ports = createDesktopMainPorts({
    configStore: {
      read() {
        return { contentRoot: '/docs', recentContentRoots: ['/docs'] };
      },
      write(nextConfig) {
        return nextConfig;
      },
    },
    shell: {
      canApplyTargetNow() {
        return 1;
      },
      emitEvent() {},
      focusMainWindow() {},
      handleIpc() {},
      async chooseDirectory() {
        return { canceled: false, filePaths: ['/picked/root'] };
      },
      resolvePath(targetPath) {
        return targetPath;
      },
    },
    watcher: {
      scheduleReload() {},
      restart() {},
      close() {},
    },
    menuAdapter: {
      buildTemplate() {
        return [];
      },
      set() {},
    },
  });

  assert.deepEqual(ports.configStore.read(), { contentRoot: '/docs', recentContentRoots: ['/docs'] });
  assert.equal(ports.shell.canApplyTargetNow(), true);
  assert.deepEqual(await ports.shell.chooseDirectory({}), { canceled: false, filePaths: ['/picked/root'] });
});

test('desktop main ports reject invalid config snapshots and directory picker results', async () => {
  const invalidConfigPorts = createDesktopMainPorts({
    configStore: {
      read() {
        return { contentRoot: 1, recentContentRoots: [] };
      },
      write(nextConfig) {
        return nextConfig;
      },
    },
    shell: {
      canApplyTargetNow() {
        return true;
      },
      emitEvent() {},
      focusMainWindow() {},
      handleIpc() {},
      async chooseDirectory() {
        return { canceled: false, filePaths: ['/picked/root'] };
      },
      resolvePath(targetPath) {
        return targetPath;
      },
    },
    watcher: {
      scheduleReload() {},
      restart() {},
      close() {},
    },
    menuAdapter: {
      buildTemplate() {
        return [];
      },
      set() {},
    },
  });

  assert.throws(() => invalidConfigPorts.configStore.read(), {
    message: 'Expected config snapshot.contentRoot to be a string or null',
  });

  const invalidPickerPorts = createDesktopMainPorts({
    configStore: {
      read() {
        return { contentRoot: null, recentContentRoots: [] };
      },
      write(nextConfig) {
        return nextConfig;
      },
    },
    shell: {
      canApplyTargetNow() {
        return true;
      },
      emitEvent() {},
      focusMainWindow() {},
      handleIpc() {},
      async chooseDirectory() {
        return { canceled: 'nope', filePaths: [123] };
      },
      resolvePath(targetPath) {
        return targetPath;
      },
    },
    watcher: {
      scheduleReload() {},
      restart() {},
      close() {},
    },
    menuAdapter: {
      buildTemplate() {
        return [];
      },
      set() {},
    },
  });

  await assert.rejects(() => invalidPickerPorts.shell.chooseDirectory({}), {
    message: 'Expected directory picker result.canceled to be a boolean',
  });
});

test('desktop command payload validation accepts recent root payload shapes and rejects invalid ones', () => {
  assert.deepEqual(normalizeDesktopCommandPayload('open-recent-content-root', '/docs'), '/docs');
  assert.deepEqual(normalizeDesktopCommandPayload('open-recent-content-root', { contentRoot: '/docs' }), { contentRoot: '/docs' });
  assert.throws(() => normalizeDesktopCommandPayload('open-recent-content-root', { contentRoot: 1 }), {
    message: 'Expected open-recent-content-root payload.contentRoot to be a string',
  });
});

test('desktop error normalization maps expected error contracts', () => {
  assert.deepEqual(normalizeDirectoryPickerResult({ canceled: true, filePaths: [] }), { canceled: true, filePaths: [] });
  assert.deepEqual(normalizeDesktopError(Object.assign(new Error('missing'), { code: 'ENOENT' })), {
    code: 'NOT_FOUND',
    message: '파일이나 폴더를 찾을 수 없습니다.',
  });
  assert.deepEqual(normalizeDesktopError(new TypeError('bad input')), {
    code: 'INVALID_INPUT',
    message: 'bad input',
  });
});
