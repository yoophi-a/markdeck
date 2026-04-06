const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const SEARCH_RESULTS_CACHE_LIMIT = 24;
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function createContentRepository({ getContentRoot, shouldIgnoreEntry }) {
  let searchIndexPromise = null;
  let searchIndexCache = null;
  let searchResultsCache = new Map();
  let documentCache = new Map();
  let assetCache = new Map();

  function normalizeSegments(segments = []) {
    return segments.filter(Boolean);
  }

  function normalizeRelativePath(relativePath = '') {
    return normalizeSegments(relativePath.split('/')).join('/');
  }

  function assertSafePath(relativePath) {
    const contentRoot = getContentRoot();
    const resolvedPath = path.resolve(contentRoot, relativePath);
    const relativeToRoot = path.relative(contentRoot, resolvedPath);

    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      throw new Error('Unsafe path outside of content root');
    }

    return resolvedPath;
  }

  function sortBrowserEntries(a, b) {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    if (a.type === 'directory') return -1;
    if (b.type === 'directory') return 1;
    if (a.type === 'markdown') return -1;
    if (b.type === 'markdown') return 1;
    return a.name.localeCompare(b.name);
  }

  function sortTreeNodes(a, b) {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }

    if (a.type === 'directory') return -1;
    return 1;
  }

  function extractTitle(relativePath, content) {
    const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    return heading || path.basename(relativePath, '.md');
  }

  async function listDirectory(relativePath = '') {
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = assertSafePath(normalizedPath);
    const dirents = await fsp.readdir(absolutePath, { withFileTypes: true });

    const entries = await Promise.all(
      dirents
        .filter((entry) => !shouldIgnoreEntry(entry.name))
        .map(async (entry) => {
          const entryRelativePath = normalizeSegments([...normalizedPath.split('/').filter(Boolean), entry.name]).join('/');
          const entryAbsolutePath = path.join(absolutePath, entry.name);
          const stats = await fsp.stat(entryAbsolutePath);

          if (entry.isDirectory()) {
            return {
              name: entry.name,
              relativePath: entryRelativePath,
              type: 'directory',
              updatedAt: stats.mtime.toISOString(),
            };
          }

          if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
            return {
              name: entry.name,
              relativePath: entryRelativePath,
              type: 'markdown',
              size: stats.size,
              updatedAt: stats.mtime.toISOString(),
            };
          }

          return {
            name: entry.name,
            relativePath: entryRelativePath,
            type: 'file',
            size: stats.size,
            updatedAt: stats.mtime.toISOString(),
          };
        })
    );

    return entries.sort(sortBrowserEntries);
  }

  async function buildDocumentTree(relativePath = '', depth = 2) {
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = assertSafePath(normalizedPath);
    const dirents = await fsp.readdir(absolutePath, { withFileTypes: true });

    const nodes = await Promise.all(
      dirents
        .filter((entry) => !shouldIgnoreEntry(entry.name))
        .map(async (entry) => {
          const entryRelativePath = normalizeSegments([...normalizedPath.split('/').filter(Boolean), entry.name]).join('/');

          if (entry.isDirectory()) {
            return {
              name: entry.name,
              relativePath: entryRelativePath,
              type: 'directory',
              children: depth > 1 ? await buildDocumentTree(entryRelativePath, depth - 1) : undefined,
            };
          }

          if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
            return {
              name: entry.name,
              relativePath: entryRelativePath,
              type: 'markdown',
            };
          }

          return null;
        })
    );

    return nodes.filter(Boolean).sort(sortTreeNodes);
  }

  async function readMarkdownDocument(relativePath) {
    const normalizedPath = normalizeRelativePath(relativePath);

    if (!normalizedPath.toLowerCase().endsWith('.md')) {
      throw new Error('Only markdown files are supported');
    }

    const absolutePath = assertSafePath(normalizedPath);
    const stats = await fsp.stat(absolutePath);
    const cached = documentCache.get(normalizedPath);

    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.payload;
    }

    const content = await fsp.readFile(absolutePath, 'utf8');
    const payload = {
      absolutePath,
      relativePath: normalizedPath,
      content,
      title: extractTitle(normalizedPath, content),
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
    };

    documentCache.set(normalizedPath, {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      payload,
    });

    return payload;
  }

  async function collectMarkdownFiles(directoryPath) {
    const dirents = await fsp.readdir(directoryPath, { withFileTypes: true });
    const nestedResults = await Promise.all(
      dirents
        .filter((entry) => !shouldIgnoreEntry(entry.name))
        .map(async (entry) => {
          const entryPath = path.join(directoryPath, entry.name);

          if (entry.isDirectory()) {
            return collectMarkdownFiles(entryPath);
          }

          if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
            return [entryPath];
          }

          return [];
        })
    );

    return nestedResults.flat();
  }

  async function buildSearchIndex() {
    const contentRoot = getContentRoot();
    const markdownFiles = await collectMarkdownFiles(contentRoot);
    const documents = await Promise.all(
      markdownFiles.map(async (filePath) => {
        const relativePath = path.relative(contentRoot, filePath).split(path.sep).join('/');
        const [content, stats] = await Promise.all([fsp.readFile(filePath, 'utf8'), fsp.stat(filePath)]);
        const title = extractTitle(relativePath, content);

        return {
          relativePath,
          title,
          content,
          contentLower: `${relativePath}\n${title}\n${content}`.toLowerCase(),
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
          mtimeMs: stats.mtimeMs,
        };
      })
    );

    documents.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    return {
      contentRoot,
      documents,
      markdownRelativePaths: documents.map((document) => document.relativePath),
      generatedAt: new Date().toISOString(),
    };
  }

  async function ensureSearchIndex() {
    const contentRoot = getContentRoot();

    if (searchIndexCache && searchIndexCache.contentRoot === contentRoot) {
      return searchIndexCache;
    }

    if (!searchIndexPromise) {
      searchIndexPromise = buildSearchIndex()
        .then((index) => {
          searchIndexCache = index;
          searchIndexPromise = null;
          return index;
        })
        .catch((error) => {
          searchIndexPromise = null;
          throw error;
        });
    }

    return searchIndexPromise;
  }

  async function collectMarkdownRelativePaths() {
    const index = await ensureSearchIndex();
    return [...index.markdownRelativePaths];
  }

  function buildSnippet(content, normalizedQuery) {
    const compact = content.replace(/\s+/g, ' ').trim();
    const index = compact.toLowerCase().indexOf(normalizedQuery);

    if (index === -1) {
      return compact.slice(0, 180);
    }

    const start = Math.max(0, index - 60);
    const end = Math.min(compact.length, index + normalizedQuery.length + 120);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < compact.length ? '…' : '';

    return `${prefix}${compact.slice(start, end)}${suffix}`;
  }

  async function searchMarkdownDocuments(query) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const cacheKey = `${getContentRoot()}::${normalizedQuery}`;
    const cached = searchResultsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const index = await ensureSearchIndex();
    const results = index.documents
      .filter((document) => document.contentLower.includes(normalizedQuery))
      .map((document) => ({
        relativePath: document.relativePath,
        title: document.title,
        snippet: buildSnippet(document.content, normalizedQuery),
        size: document.size,
        updatedAt: document.updatedAt,
      }));

    searchResultsCache.set(cacheKey, results);
    if (searchResultsCache.size > SEARCH_RESULTS_CACHE_LIMIT) {
      const firstKey = searchResultsCache.keys().next().value;
      if (firstKey) {
        searchResultsCache.delete(firstKey);
      }
    }

    return results;
  }

  async function getSearchStatus() {
    const index = await ensureSearchIndex();

    return {
      documentCount: index.documents.length,
      generatedAt: index.generatedAt,
      cachedQueryCount: searchResultsCache.size,
    };
  }

  async function readAsset(relativePath) {
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = assertSafePath(normalizedPath);
    const stats = await fsp.stat(absolutePath);
    const cached = assetCache.get(normalizedPath);

    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.payload;
    }

    const buffer = await fsp.readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const payload = {
      relativePath: normalizedPath,
      contentType: MIME_TYPES[extension] || 'application/octet-stream',
      dataBase64: buffer.toString('base64'),
      size: stats.size,
    };

    assetCache.set(normalizedPath, {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      payload,
    });

    return payload;
  }

  function invalidateAllCaches() {
    searchIndexCache = null;
    searchIndexPromise = null;
    searchResultsCache = new Map();
    documentCache = new Map();
    assetCache = new Map();
  }

  function invalidateCachesForPath(relativePath = null) {
    if (!relativePath) {
      invalidateAllCaches();
      return;
    }

    const normalizedPath = normalizeRelativePath(relativePath);
    const normalizedDirectoryPrefix = normalizedPath ? `${normalizedPath}/` : '';
    const isMarkdown = normalizedPath.toLowerCase().endsWith('.md');

    if (isMarkdown) {
      documentCache.delete(normalizedPath);
    }

    assetCache.delete(normalizedPath);

    if (!searchIndexCache) {
      searchResultsCache = new Map();
      return;
    }

    const shouldRebuildSearchIndex =
      !normalizedPath ||
      isMarkdown ||
      searchIndexCache.markdownRelativePaths.some((item) => item === normalizedPath || item.startsWith(normalizedDirectoryPrefix));

    if (shouldRebuildSearchIndex) {
      searchIndexCache = null;
    }

    searchResultsCache = new Map();
  }

  function pathExists(targetPath) {
    return fs.existsSync(targetPath);
  }

  return {
    listDirectory,
    buildDocumentTree,
    readMarkdownDocument,
    collectMarkdownRelativePaths,
    searchMarkdownDocuments,
    getSearchStatus,
    readAsset,
    invalidateAllCaches,
    invalidateCachesForPath,
    normalizeRelativePath,
    pathExists,
  };
}

module.exports = {
  createContentRepository,
};
