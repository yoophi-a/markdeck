'use client';

import { useEffect, useMemo, useState } from 'react';

import { isDesktopRenderer, readDesktopAsset } from '@/platform/desktop/renderer/desktop-api';

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
  const shouldUseDesktopApi = useMemo(() => isDesktopRenderer(), []);

  useEffect(() => {
    if (!shouldUseDesktopApi) {
      return;
    }

    let active = true;
    let nextObjectUrl: string | null = null;

    void readDesktopAsset(relativePath)
      .then((asset) => {
        if (!active || !asset) {
          return;
        }

        const binary = atob(asset.dataBase64);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        nextObjectUrl = URL.createObjectURL(new Blob([bytes], { type: asset.contentType }));
        setObjectUrl(nextObjectUrl);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [relativePath, shouldUseDesktopApi]);

  return objectUrl;
}
