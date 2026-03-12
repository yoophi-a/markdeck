import { FileText, Folder, Minus } from 'lucide-react';

import type { BrowserEntry } from '@/shared/lib/content-types';
import { formatDateTime, formatFileSize } from '@/shared/lib/format';
import { toBrowseHref, toDocHref } from '@/shared/lib/routes';
import { AppLink } from '@/shared/ui/app-link';

interface BrowserListProps {
  entries: BrowserEntry[];
}

export function BrowserList({ entries }: BrowserListProps) {
  return (
    <ul className="browser-list">
      {entries.map((entry) => {
        const href = entry.type === 'directory' ? toBrowseHref(entry.relativePath) : entry.type === 'markdown' ? toDocHref(entry.relativePath) : undefined;

        return (
          <li key={`${entry.type}:${entry.relativePath}`} className="browser-list-item">
            <div className="browser-entry-main">
              <span className="entry-type">{iconForType(entry.type)}</span>
              {href ? (
                <AppLink href={href} className="browser-entry-link">
                  {entry.name}
                </AppLink>
              ) : (
                <span className="muted">{entry.name}</span>
              )}
            </div>
            <div className="browser-entry-meta muted mono">
              <span>{entry.type === 'directory' ? 'folder' : formatFileSize(entry.size)}</span>
              <span>{formatDateTime(entry.updatedAt)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function iconForType(type: BrowserEntry['type']) {
  switch (type) {
    case 'directory':
      return <Folder className="size-4" />;
    case 'markdown':
      return <FileText className="size-4" />;
    default:
      return <Minus className="size-4" />;
  }
}
