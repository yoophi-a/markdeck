import test from 'node:test';
import assert from 'node:assert/strict';

import { getDesktopDocumentDirectoryPath, loadDesktopDocumentPageData } from './desktop-query-flows.ts';

test('getDesktopDocumentDirectoryPath resolves the sidebar tree root for document routes', () => {
  assert.equal(getDesktopDocumentDirectoryPath('Guide.md'), '');
  assert.equal(getDesktopDocumentDirectoryPath('docs/nested/Guide.md'), 'docs/nested');
});

test('loadDesktopDocumentPageData composes the IPC-backed document page flow', async () => {
  const calls: string[] = [];
  const document = {
    absolutePath: '/vault/docs/Guide.md',
    relativePath: 'docs/Guide.md',
    content: '# Guide',
    title: 'Guide',
    size: 7,
    updatedAt: '2026-07-28T00:00:00.000Z',
  };
  const sidebarTree = [
    {
      name: 'Guide.md',
      relativePath: 'docs/Guide.md',
      type: 'markdown' as const,
    },
  ];

  const result = await loadDesktopDocumentPageData('docs/Guide.md', {
    readMarkdownDocument: async (relativePath) => {
      calls.push(`document:${relativePath}`);
      return document;
    },
    collectMarkdownRelativePaths: async () => {
      calls.push('known-documents');
      return ['docs/Guide.md', 'README.md'];
    },
    buildDocumentTree: async (relativePath, depth) => {
      calls.push(`tree:${relativePath}:${depth}`);
      return sidebarTree;
    },
  });

  assert.deepEqual(calls.sort(), ['document:docs/Guide.md', 'known-documents', 'tree:docs:1']);
  assert.deepEqual(result, {
    document,
    knownDocuments: ['docs/Guide.md', 'README.md'],
    sidebarTree,
  });
});
