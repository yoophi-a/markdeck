import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppHref, getDesktopHashHref, parseAppRoute } from './app-routes.ts';

test('createAppHref normalizes desktop renderer paths and search params', () => {
  assert.equal(createAppHref('browse/docs/', 'q=hello'), '/browse/docs?q=hello');
  assert.equal(createAppHref('/', '?q=hello'), '/?q=hello');
});

test('getDesktopHashHref creates HashRouter-compatible desktop links', () => {
  assert.equal(getDesktopHashHref('/docs/Guide.md'), '/desktop#/docs/Guide.md');
  assert.equal(getDesktopHashHref('/search', 'q=Guide'), '/desktop#/search?q=Guide');
});

test('parseAppRoute decodes route segments and search query state', () => {
  assert.deepEqual(parseAppRoute('/browse/Folder%20A/Nested'), {
    kind: 'browse',
    segments: ['Folder A', 'Nested'],
  });
  assert.deepEqual(parseAppRoute('/docs/Folder%20A/Guide.md'), {
    kind: 'document',
    segments: ['Folder A', 'Guide.md'],
  });
  assert.deepEqual(parseAppRoute('/search', '?q=%20markdown%20'), {
    kind: 'search',
    query: 'markdown',
  });
});
