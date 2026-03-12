import Link from 'next/link';
import type { Route } from 'next';

import { toBrowseHref } from '@/shared/lib/routes';

interface BreadcrumbsProps {
  segments?: string[];
  currentLabel?: string;
}

export function Breadcrumbs({ segments = [], currentLabel }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href={'/' as Route}>Home</Link>
      <span className="breadcrumb-separator">/</span>
      <Link href={'/browse' as Route}>browse</Link>
      {segments.map((segment, index) => {
        const partialPath = segments.slice(0, index + 1).join('/');

        return (
          <span key={partialPath} className="breadcrumb-item">
            <span className="breadcrumb-separator">/</span>
            <Link href={toBrowseHref(partialPath) as Route}>{segment}</Link>
          </span>
        );
      })}
      {currentLabel ? (
        <span className="breadcrumb-item current">
          <span className="breadcrumb-separator">/</span>
          <span>{currentLabel}</span>
        </span>
      ) : null}
    </nav>
  );
}
