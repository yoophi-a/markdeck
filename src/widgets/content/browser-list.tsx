import Link from 'next/link';
import type { Route } from 'next';

import type { BrowserEntry } from '@/shared/lib/content';
import { formatDateTime, formatFileSize } from '@/shared/lib/format';
import { toBrowseHref, toDocHref } from '@/shared/lib/routes';

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
                <Link href={href as Route}>{entry.name}</Link>
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
      return '📁';
    case 'markdown':
      return '📝';
    default:
      return '—';
  }
}
