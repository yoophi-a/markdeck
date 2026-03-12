'use client';

import Link from 'next/link';
import { Link as RouterLink } from 'react-router-dom';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { getDesktopHashHref } from '@/shared/lib/app-routes';

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export function AppLink({ href, children, ...props }: AppLinkProps) {
  if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  if (isDesktopRenderer()) {
    return (
      <RouterLink to={href} {...props}>
        {children}
      </RouterLink>
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
