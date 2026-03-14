const test = require('node:test');
const assert = require('node:assert/strict');

const { createDesktopMainCommands } = require('./main/application/desktop-main-commands');
const { createDesktopMainQueries } = require('./main/application/desktop-main-queries');

test('desktop main commands split write-side behaviors from read-side queries', async () => {
  const calls = [];
  const commands = createDesktopMainCommands({
    contentRootUseCases: {
      async chooseContentRoot() {
        calls.push(['chooseContentRoot']);
        return '/picked/root';
      },
      openRecentContentRoot(contentRoot) {
        calls.push(['openRecentContentRoot', contentRoot]);
        return contentRoot;
      },
    },
    contentRefresh: {
      emitContentInvalidated(relativePath, reason) {
        calls.push(['emitContentInvalidated', relativePath, reason]);
      },
    },
    launchTargetUseCases: {
      sendDesktopCommand(command, payload) {
        calls.push(['sendDesktopCommand', command, payload]);
      },
    },
  });

  const queries = createDesktopMainQueries({
    getConfiguredDesktopContentRoot() {
      return '/docs';
    },
    getDesktopRecentContentRoots() {
      return ['/docs', '/older'];
    },
    contentRepository: {
      listDirectory(relativePath) {
        calls.push(['listDirectory', relativePath]);
        return [{ name: 'guide.md' }];
      },
      buildDocumentTree(relativePath, depth) {
        calls.push(['buildDocumentTree', relativePath, depth]);
        return [{ relativePath: 'guide.md' }];
      },
      readMarkdownDocument(relativePath) {
        calls.push(['readMarkdownDocument', relativePath]);
        return { relativePath, content: '# Guide' };
      },
      collectMarkdownRelativePaths() {
        calls.push(['collectMarkdownRelativePaths']);
        return ['guide.md'];
      },
      searchMarkdownDocuments(query) {
        calls.push(['searchMarkdownDocuments', query]);
        return [];
      },
      getSearchStatus() {
        calls.push(['getSearchStatus']);
        return { documentCount: 1, generatedAt: null, cachedQueryCount: 0 };
      },
      readAsset(relativePath) {
        calls.push(['readAsset', relativePath]);
        return { relativePath, contentType: 'text/plain', dataBase64: '', size: 0 };
      },
    },
  });

  assert.deepEqual(commands.getSupportedCommands().slice(0, 3), ['focus-search', 'go-back', 'go-browse']);
  assert.equal(await commands.execute('open-content-root'), '/picked/root');
  assert.equal(commands.execute('open-recent-content-root', { contentRoot: '/recent/root' }), '/recent/root');
  assert.equal(commands.execute('reload-content'), true);
  assert.equal(commands.execute('go-search', { from: 'menu' }), true);

  assert.equal(queries.getContentRoot(), '/docs');
  assert.deepEqual(queries.getRecentContentRoots(), ['/docs', '/older']);
  assert.deepEqual(queries.listDirectory('notes'), [{ name: 'guide.md' }]);
  assert.deepEqual(queries.buildDocumentTree('notes', 3), [{ relativePath: 'guide.md' }]);
  assert.deepEqual(queries.readMarkdownDocument('guide.md'), { relativePath: 'guide.md', content: '# Guide' });
  assert.deepEqual(queries.collectMarkdownRelativePaths(), ['guide.md']);
  assert.deepEqual(queries.searchMarkdownDocuments('hello'), []);
  assert.deepEqual(queries.getSearchStatus(), { documentCount: 1, generatedAt: null, cachedQueryCount: 0 });
  assert.deepEqual(queries.readAsset('image.png'), { relativePath: 'image.png', contentType: 'text/plain', dataBase64: '', size: 0 });

  assert.deepEqual(calls, [
    ['chooseContentRoot'],
    ['openRecentContentRoot', '/recent/root'],
    ['emitContentInvalidated', null, 'manual-refresh'],
    ['sendDesktopCommand', 'go-search', { from: 'menu' }],
    ['listDirectory', 'notes'],
    ['buildDocumentTree', 'notes', 3],
    ['readMarkdownDocument', 'guide.md'],
    ['collectMarkdownRelativePaths'],
    ['searchMarkdownDocuments', 'hello'],
    ['getSearchStatus'],
    ['readAsset', 'image.png'],
  ]);
});
