import Link from 'next/link';
import type { Route } from 'next';

import type { HeadingItem } from '@/shared/lib/markdown';

interface TableOfContentsProps {
  headings: HeadingItem[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="card toc-card">
      <p className="eyebrow">TOC</p>
      <h2>목차</h2>
      <nav aria-label="Table of contents">
        <ol className="toc-list">
          {headings.map((heading) => (
            <li key={heading.id} className={`toc-item depth-${heading.depth}`}>
              <Link href={`#${heading.id}` as Route} scroll className="toc-link">
                {heading.text}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
