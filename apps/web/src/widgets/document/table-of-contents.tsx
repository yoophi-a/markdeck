'use client';

import { ListTree } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { HeadingItem } from '@/shared/lib/markdown';
import { AppAnchorLink } from '@/shared/ui/app-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface TableOfContentsProps {
  headings: HeadingItem[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const headingElements = headings.map((heading) => document.getElementById(heading.id)).filter((element): element is HTMLElement => Boolean(element));

    if (headingElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: '0px 0px -70% 0px',
        threshold: [0, 1],
      }
    );

    headingElements.forEach((element) => observer.observe(element));

    function handleScroll() {
      const current = headingElements.filter((element) => element.getBoundingClientRect().top <= 120).at(-1);
      if (current) {
        setActiveId(current.id);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [headings]);

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
                {headings.map((heading) => {
                  const isActive = heading.id === activeId;
                  return (
                    <li key={heading.id} className={`toc-item depth-${heading.depth}`}>
                      <AppAnchorLink href={`#${heading.id}`} className={`toc-link${isActive ? ' active' : ''}`} aria-current={isActive ? 'location' : undefined}>
                        {heading.text}
                      </AppAnchorLink>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}
