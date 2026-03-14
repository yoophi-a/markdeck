import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeDocument } from '../../../../src/views/desktop/document/lib/document-summary.ts';

test('summarizeDocument counts headings, links, images, and reading minutes', () => {
  const content = [
    '# Title',
    '',
    'This paragraph links to [Guide](./guide.md) and shows ![Diagram](./diagram.png).',
    '',
    '```ts',
    'const ignored = `inline code inside block`;',
    '```',
    '',
    'Another short paragraph.',
  ].join('\n');

  const summary = summarizeDocument(content, 3);

  assert.deepEqual(summary, {
    headingCount: 3,
    linkCount: 2,
    imageCount: 1,
    readingMinutes: 1,
  });
});
