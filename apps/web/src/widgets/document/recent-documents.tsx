'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { formatDateTime } from '@/shared/lib/format';
import { toDocHref } from '@/shared/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface RecentDocumentItem {
  relativePath: string;
  title: string;
  viewedAt: string;
}

interface RecentDocumentsProps {
  currentDocument?: RecentDocumentItem;
  limit?: number;
  emptyMessage?: string;
}

const STORAGE_KEY = 'markdeck:recent-documents';
const DEFAULT_LIMIT = 12;

export function RecentDocuments({ currentDocument, limit = DEFAULT_LIMIT, emptyMessage = '아직 최근 본 문서가 없습니다.' }: RecentDocumentsProps) {
  const [items, setItems] = useState<RecentDocumentItem[]>([]);

  useEffect(() => {
    const nextItems = readRecentDocuments();

    if (!currentDocument) {
      setItems(nextItems.slice(0, limit));
      return;
    }

    const mergedItems = [
      {
        ...currentDocument,
        viewedAt: new Date().toISOString(),
      },
      ...nextItems.filter((item) => item.relativePath !== currentDocument.relativePath),
    ].slice(0, limit);

    writeRecentDocuments(mergedItems);
    setItems(mergedItems);
  }, [currentDocument, limit]);

  const visibleItems = useMemo(() => {
    if (!currentDocument) {
      return items;
    }

    return items.filter((item) => item.relativePath !== currentDocument.relativePath).slice(0, limit);
  }, [currentDocument, items, limit]);

  return (
    <Card className="recent-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="size-4" />
          최근 본 문서
        </CardTitle>
        <CardDescription>이 브라우저에서 최근에 읽은 문서를 다시 빠르게 열 수 있어요.</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleItems.length > 0 ? (
          <ScrollArea className="max-h-80 pr-3">
            <ul className="search-results recent-documents-list">
              {visibleItems.map((item) => (
                <li key={item.relativePath} className="search-result-item recent-document-item">
                  <div className="stack search-result-main">
                    <Link href={toDocHref(item.relativePath) as Route} className="search-result-title">
                      {item.title}
                    </Link>
                    <span className="muted mono">{item.relativePath}</span>
                  </div>
                  <div className="browser-entry-meta muted mono">
                    <span>viewed {formatDateTime(item.viewedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="muted">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

function readRecentDocuments(): RecentDocumentItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as RecentDocumentItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is RecentDocumentItem => Boolean(item?.relativePath && item?.title && item?.viewedAt))
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
  } catch {
    return [];
  }
}

function writeRecentDocuments(items: RecentDocumentItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
