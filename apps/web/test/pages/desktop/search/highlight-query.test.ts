import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHighlightSegments, escapeRegExp } from '../../../../src/views/desktop/search/lib/highlight-query.ts';

test('buildHighlightSegments marks case-insensitive matches', () => {
  const segments = buildHighlightSegments('MarkDeck search MARKDECK results', 'markdeck');

  assert.deepEqual(
    segments.filter((segment) => segment.text.length > 0),
    [
      { text: 'MarkDeck', matched: true },
      { text: ' search ', matched: false },
      { text: 'MARKDECK', matched: true },
      { text: ' results', matched: false },
    ]
  );
});

test('escapeRegExp escapes regular expression control characters', () => {
  assert.equal(escapeRegExp('docs/(draft)+v2?'), 'docs/\\(draft\\)\\+v2\\?');
});
