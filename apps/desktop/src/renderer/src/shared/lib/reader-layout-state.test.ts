import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_READER_LAYOUT_SETTINGS,
  clampReaderPanelWidth,
  normalizeReaderLayoutSettings,
  resolveReaderLayoutClassName,
} from './reader-layout-state.ts';

test('clampReaderPanelWidth rounds and clamps panel width to desktop reader limits', () => {
  assert.equal(clampReaderPanelWidth(100), 220);
  assert.equal(clampReaderPanelWidth(279.6), 280);
  assert.equal(clampReaderPanelWidth(999), 420);
});

test('normalizeReaderLayoutSettings fills defaults and keeps explicit false values', () => {
  assert.deepEqual(normalizeReaderLayoutSettings(null), DEFAULT_READER_LAYOUT_SETTINGS);
  assert.deepEqual(normalizeReaderLayoutSettings({ showTree: false, showFeedback: false, showToc: false, isDocumentMaximized: true }), {
    showTree: false,
    showFeedback: false,
    showToc: false,
    isDocumentMaximized: true,
    treeWidth: 280,
    rightPanelWidth: 280,
  });
});

test('normalizeReaderLayoutSettings migrates old right panel width keys', () => {
  assert.equal(normalizeReaderLayoutSettings({ feedbackWidth: 310 }).rightPanelWidth, 310);
  assert.equal(normalizeReaderLayoutSettings({ tocWidth: 315 }).rightPanelWidth, 315);
  assert.equal(normalizeReaderLayoutSettings({ rightPanelWidth: 320, feedbackWidth: 310, tocWidth: 315 }).rightPanelWidth, 320);
});

test('resolveReaderLayoutClassName reflects visible reader panels', () => {
  assert.equal(
    resolveReaderLayoutClassName({ showTree: true, showFeedback: true, showToc: false, isDocumentMaximized: false }),
    'document-layout with-tree has-tree has-toc'
  );
  assert.equal(
    resolveReaderLayoutClassName({ showTree: false, showFeedback: false, showToc: false, isDocumentMaximized: true }),
    'document-layout is-maximized'
  );
});
