'use client';

import Link from 'next/link';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { getDesktopHashHref } from '@/shared/lib/app-routes';

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export function AppLink({ href, children, ...props }: AppLinkProps) {
  const inRouterContext = useInRouterContext();

  if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  if (isDesktopRenderer() && inRouterContext) {
    return (
      <RouterLink to={href} {...props}>
        {children}
      </RouterLink>
    );
  }

  if (isDesktopRenderer()) {
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
  if (isDesktopRenderer() && href.startsWith('/')) {
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
