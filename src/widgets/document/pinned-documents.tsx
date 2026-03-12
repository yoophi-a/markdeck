'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Pin, PinOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { formatDateTime } from '@/shared/lib/format';
import { toDocHref } from '@/shared/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';

export interface PinnedDocumentItem {
  relativePath: string;
  title: string;
  pinnedAt: string;
}

interface PinnedDocumentsProps {
  currentDocument?: Pick<PinnedDocumentItem, 'relativePath' | 'title'>;
  limit?: number;
  emptyMessage?: string;
}

const STORAGE_KEY = 'markdeck:pinned-documents';
const DEFAULT_LIMIT = 12;

export function PinnedDocuments({ currentDocument, limit = DEFAULT_LIMIT, emptyMessage = '아직 고정한 문서가 없습니다.' }: PinnedDocumentsProps) {
  const [items, setItems] = useState<PinnedDocumentItem[]>([]);

  useEffect(() => {
    setItems(readPinnedDocuments());
  }, []);

  const isPinned = useMemo(() => {
    if (!currentDocument) {
      return false;
    }

    return items.some((item) => item.relativePath === currentDocument.relativePath);
  }, [currentDocument, items]);

  const visibleItems = useMemo(() => items.slice(0, limit), [items, limit]);

  function handleTogglePin() {
    if (!currentDocument) {
      return;
    }

    const nextItems = isPinned
      ? items.filter((item) => item.relativePath !== currentDocument.relativePath)
      : [
          {
            ...currentDocument,
            pinnedAt: new Date().toISOString(),
          },
          ...items.filter((item) => item.relativePath !== currentDocument.relativePath),
        ];

    writePinnedDocuments(nextItems);
    setItems(nextItems);
  }

  return (
    <Card className="recent-card">
      <CardHeader>
        <div className="document-panel-header">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pin className="size-4" />
              즐겨찾기 문서
            </CardTitle>
            <CardDescription>자주 보는 문서를 고정해서 홈과 문서 화면에서 바로 다시 열 수 있어요.</CardDescription>
          </div>
          {currentDocument ? (
            <Button type="button" variant="outline" size="sm" onClick={handleTogglePin} className="pin-toggle-button">
              {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              {isPinned ? 'Unpin' : 'Pin'}
            </Button>
          ) : null}
        </div>
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
                    <span>pinned {formatDateTime(item.pinnedAt)}</span>
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

function readPinnedDocuments(): PinnedDocumentItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as PinnedDocumentItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is PinnedDocumentItem => Boolean(item?.relativePath && item?.title && item?.pinnedAt))
      .sort((a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime());
  } catch {
    return [];
  }
}

function writePinnedDocuments(items: PinnedDocumentItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
