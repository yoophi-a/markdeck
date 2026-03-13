'use client';

import Link from 'next/link';
import { forwardRef } from 'react';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';

import { useDesktopRenderer } from '@/platform/desktop/renderer/use-desktop-renderer';
import { getDesktopHashHref } from '@/shared/lib/app-routes';

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink({ href, children, ...props }, ref) {
  const desktopRenderer = useDesktopRenderer();
  const inRouterContext = useInRouterContext();

  if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a ref={ref} href={href} {...props}>
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
      <a ref={ref} href={getDesktopHashHref(href)} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} ref={ref} {...props}>
      {children}
    </Link>
  );
});

export const AppAnchorLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppAnchorLink({ href, children, ...props }, ref) {
  const desktopRenderer = useDesktopRenderer();

  if (desktopRenderer && href.startsWith('/')) {
    return (
      <a ref={ref} href={getDesktopHashHref(href)} {...props}>
        {children}
      </a>
    );
  }

  return (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  );
});
