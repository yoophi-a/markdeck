'use client';

import { resolveAssetHref } from '@/shared/lib/assets';
import { DesktopAssetImage } from '@/shared/ui/desktop-asset';

interface MarkdownImageProps {
  src: string;
  alt: string;
  currentRelativePath: string;
}

export function MarkdownImage({ src, alt, currentRelativePath }: MarkdownImageProps) {
  return <DesktopAssetImage relativePath={src} fallbackSrc={resolveAssetHref(currentRelativePath, src)} alt={alt} />;
}
