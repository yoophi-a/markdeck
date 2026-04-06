export function toDocHref(relativePath: string) {
  return `/docs/${encodePath(relativePath)}`;
}

export function toBrowseHref(relativePath = '') {
  return relativePath ? `/browse/${encodePath(relativePath)}` : '/';
}

export function toSettingsHref() {
  return '/settings';
}

function encodePath(relativePath: string) {
  return relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}
