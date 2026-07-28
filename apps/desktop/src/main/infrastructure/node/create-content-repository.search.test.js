const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createContentRepository } = require('./create-content-repository');

function createSearchRepository(files) {
  const contentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'markdeck-search-'));

  Object.entries(files).forEach(([relativePath, content]) => {
    const absolutePath = path.join(contentRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  });

  const repository = createContentRepository({
    getContentRoot() {
      return contentRoot;
    },
    shouldIgnoreEntry() {
      return false;
    },
  });

  return repository;
}

test('search ranks title and filename matches ahead of body-only matches', async () => {
  const repository = createSearchRepository({
    'notes/body-only.md': '# Notes\nThe alpha term appears many times. alpha alpha alpha.\n',
    'notes/alpha-reference.md': '# Reference\nA short body.\n',
    'notes/title.md': '# Alpha Guide\nA short body.\n',
  });

  const results = await repository.searchMarkdownDocuments('alpha');

  assert.deepEqual(results.map((result) => result.relativePath), [
    'notes/title.md',
    'notes/alpha-reference.md',
    'notes/body-only.md',
  ]);
});

test('search snippets describe title and path matches when the body does not match', async () => {
  const repository = createSearchRepository({
    'docs/api-reference.md': '# Reference\nBody text without the query.\n',
    'docs/title.md': '# API Guide\nBody text without the query.\n',
  });

  const results = await repository.searchMarkdownDocuments('api');

  assert.equal(results[0].snippet, 'Title: API Guide');
  assert.equal(results[1].snippet, 'Path: docs/api-reference.md');
});
