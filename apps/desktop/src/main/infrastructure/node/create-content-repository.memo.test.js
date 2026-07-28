const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createContentRepository } = require('./create-content-repository');

function createTempRepository() {
  const contentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'markdeck-memo-'));
  const repository = createContentRepository({
    getContentRoot() {
      return contentRoot;
    },
    shouldIgnoreEntry() {
      return false;
    },
  });

  return { contentRoot, repository };
}

test('memo sidecar files are read and written next to markdown documents', async () => {
  const { contentRoot, repository } = createTempRepository();
  fs.mkdirSync(path.join(contentRoot, 'docs'));
  fs.writeFileSync(path.join(contentRoot, 'docs', 'guide.md'), '# Guide\n');

  assert.equal(await repository.readMemoFile('docs/guide.md'), null);

  const written = await repository.writeMemoFile('docs/guide.md', '{"version":1}\n');
  assert.equal(written.relativePath, 'docs/guide.md.memo');
  assert.equal(written.content, '{"version":1}\n');
  assert.equal(fs.readFileSync(path.join(contentRoot, 'docs', 'guide.md.memo'), 'utf8'), '{"version":1}\n');

  const readBack = await repository.readMemoFile('docs/guide.md');
  assert.equal(readBack.relativePath, 'docs/guide.md.memo');
  assert.equal(readBack.content, '{"version":1}\n');
});

test('memo sidecar files stay hidden from directory browsing', async () => {
  const { contentRoot, repository } = createTempRepository();
  fs.writeFileSync(path.join(contentRoot, 'guide.md'), '# Guide\n');
  await repository.writeMemoFile('guide.md', '{"version":1}\n');

  const entries = await repository.listDirectory('');

  assert.deepEqual(entries.map((entry) => entry.name), ['guide.md']);
});

test('memo sidecar access rejects non-markdown and unsafe paths', async () => {
  const { repository } = createTempRepository();

  await assert.rejects(() => repository.readMemoFile('notes.txt'), {
    message: 'Only markdown files are supported',
  });
  await assert.rejects(() => repository.writeMemoFile('../secret.md', '{}'), {
    message: 'Unsafe path outside of content root',
  });
});
