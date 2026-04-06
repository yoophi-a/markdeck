'use client';

import { useEffect, useState } from 'react';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { useDesktopAssetQuery } from '@/platform/desktop/renderer/desktop-queries';

interface DesktopAssetLinkProps {
  relativePath: string;
  fallbackHref: string;
  children: React.ReactNode;
}

interface DesktopAssetImageProps {
  relativePath: string;
  fallbackSrc: string;
  alt: string;
}

export function DesktopAssetLink({ relativePath, fallbackHref, children }: DesktopAssetLinkProps) {
  const objectUrl = useDesktopAssetObjectUrl(relativePath);

  return (
    <a href={objectUrl ?? fallbackHref} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function DesktopAssetImage({ relativePath, fallbackSrc, alt }: DesktopAssetImageProps) {
  const objectUrl = useDesktopAssetObjectUrl(relativePath);

  return <img src={objectUrl ?? fallbackSrc} alt={alt} className="markdown-image" />;
}

function useDesktopAssetObjectUrl(relativePath: string) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const shouldUseDesktopApi = isDesktopRenderer();
  const assetQuery = useDesktopAssetQuery(relativePath, shouldUseDesktopApi);

  useEffect(() => {
    if (!assetQuery.data) {
      return;
    }

    const binary = atob(assetQuery.data.dataBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const nextObjectUrl = URL.createObjectURL(new Blob([bytes], { type: assetQuery.data.contentType }));
    setObjectUrl(nextObjectUrl);

    return () => {
      URL.revokeObjectURL(nextObjectUrl);
      setObjectUrl(null);
    };
  }, [assetQuery.data]);

  return objectUrl;
}
