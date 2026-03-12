import Link from 'next/link';
import type { Route } from 'next';

import type { BrowserEntry } from '@/lib/content';
import { toBrowseHref, toDocHref } from '@/lib/content';

interface BrowserListProps {
  entries: BrowserEntry[];
}

export function BrowserList({ entries }: BrowserListProps) {
  return (
    <ul className="browser-list">
      {entries.map((entry) => {
        const href = entry.type === 'directory' ? toBrowseHref(entry.relativePath) : entry.type === 'markdown' ? toDocHref(entry.relativePath) : undefined;

        return (
          <li key={`${entry.type}:${entry.relativePath}`}>
            <span className="entry-type">{iconForType(entry.type)}</span>
            {href ? (
              <Link href={href as Route}>{entry.name}</Link>
            ) : (
              <span className="muted">{entry.name}</span>
            )}
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
