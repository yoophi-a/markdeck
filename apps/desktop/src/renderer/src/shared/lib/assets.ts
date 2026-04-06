export function resolveAssetHref(currentRelativePath: string, href: string) {
  if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('data:') || href.startsWith('#')) {
    return href;
  }

  const currentDirectory = dirname(`/${currentRelativePath}`);
  const resolvedPath = normalizePath(`${currentDirectory}/${href}`);
  const cleanPath = resolvedPath.replace(/^\//, '');

  return `/assets/${encodePath(cleanPath)}`;
}

function encodePath(relativePath: string) {
  return relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function isImageAsset(href: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(href);
}

function dirname(value: string) {
  const normalized = normalizePath(value);
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`;
}

function normalizePath(value: string) {
  const segments = value.split('/');
  const stack = [];

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      stack.pop();
      continue;
    }

    stack.push(segment);
  }

  return `/${stack.join('/')}`;
}
