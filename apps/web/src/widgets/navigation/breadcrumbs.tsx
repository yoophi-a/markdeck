import { toBrowseHref } from '@/shared/lib/routes';
import { AppLink } from '@/shared/ui/app-link';

interface BreadcrumbsProps {
  segments?: string[];
  currentLabel?: string;
}

export function Breadcrumbs({ segments = [], currentLabel }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <AppLink href="/">Home</AppLink>
      <span className="breadcrumb-separator">/</span>
      <AppLink href="/browse">browse</AppLink>
      {segments.map((segment, index) => {
        const partialPath = segments.slice(0, index + 1).join('/');

        return (
          <span key={partialPath} className="breadcrumb-item">
            <span className="breadcrumb-separator">/</span>
            <AppLink href={toBrowseHref(partialPath)}>{segment}</AppLink>
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
