import path from 'node:path';

export function resolveAssetHref(currentRelativePath: string, href: string) {
  if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('data:') || href.startsWith('#')) {
    return href;
  }

  const currentDirectory = path.posix.dirname(`/${currentRelativePath}`);
  const resolvedPath = path.posix.normalize(path.posix.join(currentDirectory, href));
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
