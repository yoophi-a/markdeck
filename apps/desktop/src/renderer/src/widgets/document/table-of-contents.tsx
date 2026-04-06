'use client';

import { ListTree } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { HeadingItem } from '@/shared/lib/markdown';
import { AppAnchorLink } from '@/shared/ui/app-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface TableOfContentsProps {
  headings: HeadingItem[];
}

const ACTIVE_HEADING_OFFSET = 140;

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const headingIds = useMemo(() => headings.map((heading) => heading.id), [headings]);

  useEffect(() => {
    if (headings.length === 0) {
      setActiveId(null);
      return;
    }

    const updateActiveHeading = () => {
      const nextActiveId = resolveActiveHeadingId(headingIds);
      setActiveId((current) => (current === nextActiveId ? current : nextActiveId));
    };

    let frameId = 0;
    const scheduleUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateActiveHeading();
      });
    };

    updateActiveHeading();

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('hashchange', scheduleUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('hashchange', scheduleUpdate);
    };
  }, [headingIds, headings.length]);

  useEffect(() => {
    if (!activeId) {
      return;
    }

    const viewport = scrollViewportRef.current;
    const activeLink = activeLinkRef.current;
    if (!viewport || !activeLink) {
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const isAbove = linkRect.top < viewportRect.top;
    const isBelow = linkRect.bottom > viewportRect.bottom;

    if (isAbove || isBelow) {
      activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeId]);

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
            <div ref={scrollViewportRef}>
              <nav aria-label="Table of contents">
                <ol className="toc-list">
                  {headings.map((heading) => {
                    const isActive = heading.id === activeId;
                    return (
                      <li key={heading.id} className={`toc-item depth-${heading.depth}`}>
                        <AppAnchorLink
                          href={`#${heading.id}`}
                          className={`toc-link${isActive ? ' active' : ''}`}
                          aria-current={isActive ? 'location' : undefined}
                          ref={isActive ? activeLinkRef : undefined}
                        >
                          {heading.text}
                        </AppAnchorLink>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}

function resolveActiveHeadingId(headingIds: string[]) {
  if (headingIds.length === 0) {
    return null;
  }

  const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (hashId && headingIds.includes(hashId)) {
    const hashedHeading = document.getElementById(hashId);
    if (hashedHeading) {
      const { top, bottom } = hashedHeading.getBoundingClientRect();
      if (top <= ACTIVE_HEADING_OFFSET && bottom > 0) {
        return hashId;
      }
    }
  }

  const headingElements = headingIds
    .map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => Boolean(element));

  if (headingElements.length === 0) {
    return headingIds[0] ?? null;
  }

  const passedHeadings = headingElements.filter((element) => element.getBoundingClientRect().top <= ACTIVE_HEADING_OFFSET);
  if (passedHeadings.length > 0) {
    return passedHeadings.at(-1)?.id ?? headingIds[0] ?? null;
  }

  return headingElements[0]?.id ?? headingIds[0] ?? null;
}
