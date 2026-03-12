import Link from 'next/link';
import type { Route } from 'next';
import { ListTree } from 'lucide-react';

import type { HeadingItem } from '@/shared/lib/markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface TableOfContentsProps {
  headings: HeadingItem[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <aside>
      <Card className="toc-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTree className="size-4" />
            목차
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[60vh] pr-3">
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
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}
