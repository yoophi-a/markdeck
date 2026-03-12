export function toDocHref(relativePath: string) {
  return `/docs/${encodePath(relativePath)}`;
}

export function toBrowseHref(relativePath = '') {
  return relativePath ? `/browse/${encodePath(relativePath)}` : '/browse';
}

function encodePath(relativePath: string) {
  return relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}
