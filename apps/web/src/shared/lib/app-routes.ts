export interface AppRouteLocation {
  pathname: string;
  search: string;
}

export function normalizeAppPath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalized.replace(/\/+$/, '') || '/';
}

export function createAppHref(pathname: string, search = '') {
  const normalizedPathname = normalizeAppPath(pathname);
  const normalizedSearch = search ? (search.startsWith('?') ? search : `?${search}`) : '';
  return `${normalizedPathname}${normalizedSearch}`;
}

export function getDesktopHashHref(pathname: string, search = '') {
  return `/desktop#${createAppHref(pathname, search)}`;
}

export function parseAppRoute(pathname: string, search = '') {
  const normalizedPathname = normalizeAppPath(pathname);

  if (normalizedPathname === '/') {
    return { kind: 'home' as const };
  }

  if (normalizedPathname === '/browse') {
    return { kind: 'browse' as const, segments: [] as string[] };
  }

  if (normalizedPathname.startsWith('/browse/')) {
    return {
      kind: 'browse' as const,
      segments: decodeAppPath(normalizedPathname.slice('/browse/'.length)),
    };
  }

  if (normalizedPathname.startsWith('/docs/')) {
    const segments = decodeAppPath(normalizedPathname.slice('/docs/'.length));
    return segments.length > 0 ? { kind: 'document' as const, segments } : { kind: 'not-found' as const };
  }

  if (normalizedPathname === '/search') {
    return {
      kind: 'search' as const,
      query: new URLSearchParams(search.startsWith('?') ? search : `?${search}`).get('q')?.trim() ?? '',
    };
  }

  return { kind: 'not-found' as const };
}

function decodeAppPath(relativePath: string) {
  return relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}
