import { ChevronRight } from 'lucide-react';

import { toBrowseHref } from '@/shared/lib/routes';
import { cn } from '@/shared/lib/utils';
import { AppLink } from '@/shared/ui/app-link';
import { buttonVariants } from '@/shared/ui/button';

interface BreadcrumbsProps {
  rootLabel?: string;
  segments?: string[];
  currentLabel?: string;
}

export function Breadcrumbs({ rootLabel = '/', segments = [], currentLabel }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {segments.length === 0 && !currentLabel ? (
        <span className="breadcrumb-item current">
          <span className="breadcrumb-label">{rootLabel}</span>
        </span>
      ) : (
        <AppLink href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'breadcrumb-link')}>
          <span className="breadcrumb-label">{rootLabel}</span>
        </AppLink>
      )}
      {segments.map((segment, index) => {
        const partialPath = segments.slice(0, index + 1).join('/');
        const isCurrent = !currentLabel && index === segments.length - 1;

        return (
          <span key={partialPath} className={isCurrent ? 'breadcrumb-item current' : 'breadcrumb-item'}>
            <span className="breadcrumb-separator" aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </span>
            {isCurrent ? (
              <span className="breadcrumb-label">{segment}</span>
            ) : (
              <AppLink href={toBrowseHref(partialPath)} className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'breadcrumb-link')}>
                <span className="breadcrumb-label">{segment}</span>
              </AppLink>
            )}
          </span>
        );
      })}
      {currentLabel ? (
        <span className="breadcrumb-item current">
          <span className="breadcrumb-separator" aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </span>
          <span className="breadcrumb-label">{currentLabel}</span>
        </span>
      ) : null}
    </nav>
  );
}
