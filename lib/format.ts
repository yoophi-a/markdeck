export function joinSegments(params?: { slug?: string[] }) {
  return params?.slug ?? [];
}

export function prettyPath(relativePath: string) {
  return relativePath || '/';
}
