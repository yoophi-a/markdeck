import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampReaderPanelWidth,
  createReaderLayoutClassName,
  createReaderLayoutStyle,
  DEFAULT_READER_LAYOUT_SETTINGS,
  normalizeReaderLayoutSettings,
} from './document-reader-layout-state.ts';

test('clampReaderPanelWidth rounds and clamps panel widths', () => {
  assert.equal(clampReaderPanelWidth(120), 220);
  assert.equal(clampReaderPanelWidth(320.6), 321);
  assert.equal(clampReaderPanelWidth(640), 420);
});

test('normalizeReaderLayoutSettings fills defaults and supports legacy right panel widths', () => {
  assert.deepEqual(normalizeReaderLayoutSettings(null), DEFAULT_READER_LAYOUT_SETTINGS);

  assert.deepEqual(
    normalizeReaderLayoutSettings({
      showTree: false,
      showFeedback: false,
      showToc: true,
      isDocumentMaximized: true,
      treeWidth: 120,
      feedbackWidth: 640,
    }),
    {
      showTree: false,
      showFeedback: false,
      showToc: true,
      isDocumentMaximized: true,
      treeWidth: 220,
      rightPanelWidth: 420,
    }
  );
});

test('createReaderLayoutClassName describes visible panels and maximized mode', () => {
  assert.equal(createReaderLayoutClassName(DEFAULT_READER_LAYOUT_SETTINGS), 'document-layout with-tree has-tree has-toc');
  assert.equal(
    createReaderLayoutClassName({
      ...DEFAULT_READER_LAYOUT_SETTINGS,
      showTree: false,
      showFeedback: false,
      showToc: false,
      isDocumentMaximized: true,
    }),
    'document-layout is-maximized'
  );
});

test('createReaderLayoutStyle exposes stable CSS variables for panel widths', () => {
  assert.deepEqual(createReaderLayoutStyle({ treeWidth: 300, rightPanelWidth: 360 }), {
    '--document-tree-width': '300px',
    '--document-toc-width': '360px',
  });
});
