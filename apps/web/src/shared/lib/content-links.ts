import { toBrowseHref, toDocHref } from '@/shared/lib/routes';

export function resolveMarkdownLink(currentRelativePath: string, href: string) {
  if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) {
    return href;
  }

  const currentDirectory = dirname(`/${currentRelativePath}`);
  const resolvedPath = normalizePath(`${currentDirectory}/${href}`);
  const cleanPath = resolvedPath.replace(/^\//, '');

  if (href.endsWith('.md') || cleanPath.endsWith('.md')) {
    return toDocHref(cleanPath);
  }

  return toBrowseHref(cleanPath);
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
