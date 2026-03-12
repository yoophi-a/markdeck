export function extractCodeText(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child) => extractCodeText(child)).join('');
  }

  if (children && typeof children === 'object' && 'props' in children) {
    const props = (children as { props?: { children?: React.ReactNode } }).props;
    return extractCodeText(props?.children ?? '');
  }

  return '';
}
