import { forwardRef } from 'react';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';

interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink({ href, children, ...props }, ref) {
  const inRouterContext = useInRouterContext();

  if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    );
  }

  if (inRouterContext) {
    return (
      <RouterLink to={href} {...props}>
        {children}
      </RouterLink>
    );
  }

  return <a ref={ref} href={href} {...props}>{children}</a>;
});

export const AppAnchorLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppAnchorLink({ href, children, ...props }, ref) {
  return (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  );
});
