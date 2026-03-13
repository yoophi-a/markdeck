'use client';

import Link from 'next/link';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';

import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import { getDesktopHashHref } from '@/shared/lib/app-routes';

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export function AppLink({ href, children, ...props }: AppLinkProps) {
  const desktopRenderer = useDesktopRenderer();
  const inRouterContext = useInRouterContext();

  if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  if (desktopRenderer && inRouterContext) {
    return (
      <RouterLink to={href} {...props}>
        {children}
      </RouterLink>
    );
  }

  if (desktopRenderer) {
    return (
      <a href={getDesktopHashHref(href)} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

export function AppAnchorLink({ href, children, ...props }: AppLinkProps) {
  const desktopRenderer = useDesktopRenderer();

  if (desktopRenderer && href.startsWith('/')) {
    return (
      <a href={getDesktopHashHref(href)} {...props}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
