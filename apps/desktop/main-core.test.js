const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  DEFAULT_IGNORE_PATTERNS,
  MAX_RECENT_CONTENT_ROOTS,
  createLaunchTargetCoordinator,
  extractLaunchPathArg,
  getConfiguredContentRoot,
  getIgnorePatterns,
  getRecentContentRoots,
  mergeRecentContentRoots,
  normalizeConfig,
  resolveLaunchTargetFromArg,
  resolveLaunchTargetFromArgv,
} = require('./main-core');

function createTempFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'markdeck-desktop-main-'));
  const notesDir = path.join(root, 'notes');
  fs.mkdirSync(notesDir, { recursive: true });
  const markdownFile = path.join(notesDir, 'guide.md');
  const textFile = path.join(notesDir, 'guide.txt');
  fs.writeFileSync(markdownFile, '# Hello');
  fs.writeFileSync(textFile, 'plain');
  return { root, notesDir, markdownFile, textFile };
}

test('extractLaunchPathArg skips flags and returns the first positional path argument', () => {
  assert.equal(extractLaunchPathArg(['MarkDeck', '--flag', '--', '', '/tmp/docs']), '/tmp/docs');
  assert.equal(extractLaunchPathArg(['MarkDeck', '-psn_0_1234', '/tmp/docs']), '/tmp/docs');
  assert.equal(extractLaunchPathArg(['MarkDeck', '--inspect']), null);
});

test('resolveLaunchTargetFromArg returns a directory launch target', () => {
  const { notesDir } = createTempFixture();
  const target = resolveLaunchTargetFromArg(notesDir);

  assert.deepEqual(target, {
    contentRoot: notesDir,
    relativeDocumentPath: null,
    sourcePath: notesDir,
    targetType: 'directory',
  });
});

test('resolveLaunchTargetFromArg returns a markdown-file launch target with relative document path', () => {
  const { notesDir, markdownFile } = createTempFixture();
  const target = resolveLaunchTargetFromArg(markdownFile);

  assert.deepEqual(target, {
    contentRoot: notesDir,
    relativeDocumentPath: 'guide.md',
    sourcePath: markdownFile,
    targetType: 'markdown-file',
  });
});

test('resolveLaunchTargetFromArg ignores non-markdown files and missing paths', () => {
  const { root, textFile } = createTempFixture();

  assert.equal(resolveLaunchTargetFromArg(textFile), null);
  assert.equal(resolveLaunchTargetFromArg(path.join(root, 'missing.md')), null);
});

test('resolveLaunchTargetFromArgv composes argv extraction and target resolution', () => {
  const { markdownFile } = createTempFixture();
  const target = resolveLaunchTargetFromArgv(['MarkDeck', '--verbose', markdownFile]);

  assert.equal(target?.relativeDocumentPath, 'guide.md');
  assert.equal(target?.targetType, 'markdown-file');
});

test('normalizeConfig resolves content roots, deduplicates recent roots, and caps the list size', () => {
  const fixture = createTempFixture();
  const extras = Array.from({ length: MAX_RECENT_CONTENT_ROOTS + 3 }, (_, index) => path.join(fixture.root, `extra-${index}`));
  const normalized = normalizeConfig({
    contentRoot: fixture.notesDir,
    recentContentRoots: [fixture.notesDir, ' ', fixture.notesDir, ...extras],
  });

  assert.equal(normalized.contentRoot, fixture.notesDir);
  assert.equal(normalized.recentContentRoots[0], fixture.notesDir);
  assert.equal(normalized.recentContentRoots.length, MAX_RECENT_CONTENT_ROOTS);
  assert.deepEqual(new Set(normalized.recentContentRoots).size, normalized.recentContentRoots.length);
});

test('getConfiguredContentRoot prefers config over env and resolves both', () => {
  const fixture = createTempFixture();
  const env = { MARKDECK_CONTENT_ROOT: fixture.root };

  assert.equal(getConfiguredContentRoot({ contentRoot: fixture.notesDir }, env), fixture.notesDir);
  assert.equal(getConfiguredContentRoot({ contentRoot: null }, env), fixture.root);
  assert.equal(getConfiguredContentRoot({}, {}), null);
});

test('getRecentContentRoots keeps the active root first without duplication', () => {
  const fixture = createTempFixture();
  const recent = getRecentContentRoots(
    {
      contentRoot: fixture.notesDir,
      recentContentRoots: [fixture.root, fixture.notesDir, fixture.root],
    },
    {}
  );

  assert.deepEqual(recent, [fixture.notesDir, fixture.root]);
});

test('mergeRecentContentRoots prepends the latest root and preserves recency order', () => {
  const fixture = createTempFixture();
  const next = path.join(fixture.root, 'next');
  const merged = mergeRecentContentRoots([fixture.root, fixture.notesDir, fixture.root], next);

  assert.deepEqual(merged, [next, fixture.root, fixture.notesDir]);
});

test('getIgnorePatterns reads custom env values and falls back to defaults', () => {
  assert.deepEqual(getIgnorePatterns({ MARKDECK_IGNORE_PATTERNS: 'dist, *.tmp , cache ' }), ['dist', '*.tmp', 'cache']);
  assert.deepEqual(getIgnorePatterns({}), DEFAULT_IGNORE_PATTERNS);
});

test('launch target coordinator queues before the window is ready and applies once ready', () => {
  const calls = [];
  let ready = false;
  const coordinator = createLaunchTargetCoordinator({
    canApplyTargetNow: () => ready,
    applyLaunchTarget: (target) => {
      calls.push(target);
      return true;
    },
  });
  const target = { contentRoot: '/tmp/docs', targetType: 'directory' };

  assert.equal(coordinator.queueOrApplyLaunchTarget(target), false);
  assert.deepEqual(coordinator.getPendingLaunchTarget(), target);

  ready = true;
  assert.equal(coordinator.applyPendingLaunchTarget(), true);
  assert.deepEqual(calls, [target]);
  assert.equal(coordinator.getPendingLaunchTarget(), null);
});

test('launch target coordinator leaves pending target intact when application fails', () => {
  let ready = true;
  const target = { contentRoot: '/tmp/docs', targetType: 'directory' };
  const coordinator = createLaunchTargetCoordinator({
    canApplyTargetNow: () => ready,
    applyLaunchTarget: () => false,
  });

  assert.equal(coordinator.queueOrApplyLaunchTarget(target), false);
  assert.deepEqual(coordinator.getPendingLaunchTarget(), target);

  ready = false;
  assert.equal(coordinator.applyPendingLaunchTarget(), false);
  assert.deepEqual(coordinator.getPendingLaunchTarget(), target);
});
