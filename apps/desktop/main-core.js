const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_IGNORE_PATTERNS = ['.git', 'node_modules'];
const MAX_RECENT_CONTENT_ROOTS = 8;

function isMarkdownFilePath(filePath) {
  return path.extname(filePath).toLowerCase() === '.md';
}

function toPosixRelativePath(filePath, rootPath) {
  return path.relative(rootPath, filePath).split(path.sep).join('/');
}

function extractLaunchPathArg(argv = []) {
  const values = Array.isArray(argv) ? argv.filter((value) => typeof value === 'string' && value.trim()) : [];

  for (const value of values.slice(1)) {
    if (value === '--') {
      continue;
    }

    if (value.startsWith('-')) {
      continue;
    }

    return value;
  }

  return null;
}

function resolveLaunchTargetFromArg(rawArg) {
  if (!rawArg || typeof rawArg !== 'string' || !rawArg.trim()) {
    return null;
  }

  const candidatePath = path.resolve(rawArg);

  if (!fs.existsSync(candidatePath)) {
    return null;
  }

  const stats = fs.statSync(candidatePath);

  if (stats.isDirectory()) {
    return {
      contentRoot: candidatePath,
      relativeDocumentPath: null,
      sourcePath: candidatePath,
      targetType: 'directory',
    };
  }

  if (stats.isFile() && isMarkdownFilePath(candidatePath)) {
    const contentRoot = path.dirname(candidatePath);
    return {
      contentRoot,
      relativeDocumentPath: toPosixRelativePath(candidatePath, contentRoot),
      sourcePath: candidatePath,
      targetType: 'markdown-file',
    };
  }

  return null;
}

function resolveLaunchTargetFromArgv(argv = process.argv) {
  return resolveLaunchTargetFromArg(extractLaunchPathArg(argv));
}

function normalizeConfig(input = {}) {
  const contentRoot = typeof input.contentRoot === 'string' && input.contentRoot.trim() ? path.resolve(input.contentRoot) : null;
  const recentContentRoots = Array.isArray(input.recentContentRoots)
    ? input.recentContentRoots
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => path.resolve(value))
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, MAX_RECENT_CONTENT_ROOTS)
    : contentRoot
      ? [contentRoot]
      : [];

  return {
    contentRoot,
    recentContentRoots,
  };
}

function mergeRecentContentRoots(currentRecentContentRoots = [], nextContentRoot) {
  const normalizedRoot = nextContentRoot ? path.resolve(nextContentRoot) : null;
  const uniqueItems = currentRecentContentRoots
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => path.resolve(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  if (!normalizedRoot) {
    return uniqueItems.slice(0, MAX_RECENT_CONTENT_ROOTS);
  }

  return [normalizedRoot, ...uniqueItems.filter((item) => item !== normalizedRoot)].slice(0, MAX_RECENT_CONTENT_ROOTS);
}

function getConfiguredContentRoot(desktopConfig, env = process.env) {
  const configuredRoot = desktopConfig?.contentRoot || env.MARKDECK_CONTENT_ROOT || null;
  return configuredRoot ? path.resolve(configuredRoot) : null;
}

function getRecentContentRoots(desktopConfig, env = process.env) {
  const currentRoot = getConfiguredContentRoot(desktopConfig, env);
  const items = Array.isArray(desktopConfig?.recentContentRoots)
    ? desktopConfig.recentContentRoots.filter((item, index, values) => values.indexOf(item) === index)
    : [];

  if (!currentRoot) {
    return items.slice(0, MAX_RECENT_CONTENT_ROOTS);
  }

  return [currentRoot, ...items.filter((item) => item !== currentRoot)].slice(0, MAX_RECENT_CONTENT_ROOTS);
}

function getIgnorePatterns(env = process.env) {
  const rawValue = env.MARKDECK_IGNORE_PATTERNS;
  const customPatterns = rawValue
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return customPatterns && customPatterns.length > 0 ? customPatterns : DEFAULT_IGNORE_PATTERNS;
}

function createLaunchTargetCoordinator({ applyLaunchTarget, canApplyTargetNow }) {
  let pendingLaunchTarget = null;

  return {
    getPendingLaunchTarget() {
      return pendingLaunchTarget;
    },
    setPendingLaunchTarget(target) {
      pendingLaunchTarget = target;
    },
    queueOrApplyLaunchTarget(target) {
      if (!target) {
        return false;
      }

      pendingLaunchTarget = target;

      if (!canApplyTargetNow()) {
        return false;
      }

      const didApply = applyLaunchTarget(target);
      if (didApply) {
        pendingLaunchTarget = null;
      }

      return didApply;
    },
    applyPendingLaunchTarget() {
      if (!pendingLaunchTarget) {
        return false;
      }

      if (!canApplyTargetNow()) {
        return false;
      }

      const didApply = applyLaunchTarget(pendingLaunchTarget);
      if (didApply) {
        pendingLaunchTarget = null;
      }

      return didApply;
    },
  };
}

module.exports = {
  DEFAULT_IGNORE_PATTERNS,
  MAX_RECENT_CONTENT_ROOTS,
  createLaunchTargetCoordinator,
  extractLaunchPathArg,
  getConfiguredContentRoot,
  getIgnorePatterns,
  getRecentContentRoots,
  isMarkdownFilePath,
  mergeRecentContentRoots,
  normalizeConfig,
  resolveLaunchTargetFromArg,
  resolveLaunchTargetFromArgv,
  toPosixRelativePath,
};
