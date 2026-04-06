'use client';

import { Clock3 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useRecentDocumentsQuery, useRecordRecentDocumentMutation, type RecentDocumentItem } from '@/platform/desktop/renderer/desktop-queries';
import { formatDateTime } from '@/shared/lib/format';
import { toDocHref } from '@/shared/lib/routes';
import { AppLink } from '@/shared/ui/app-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

interface RecentDocumentsProps {
  currentDocument?: RecentDocumentItem;
  limit?: number;
  emptyMessage?: string;
}

const DEFAULT_LIMIT = 12;

export function RecentDocuments({ currentDocument, limit = DEFAULT_LIMIT, emptyMessage = '아직 최근 본 문서가 없습니다.' }: RecentDocumentsProps) {
  const recentDocumentsQuery = useRecentDocumentsQuery(true);
  const { mutate: recordRecentDocument } = useRecordRecentDocumentMutation(limit);
  const items = recentDocumentsQuery.data ?? [];

  useEffect(() => {
    if (!currentDocument) {
      return;
    }

    recordRecentDocument({
      relativePath: currentDocument.relativePath,
      title: currentDocument.title,
    });
  }, [currentDocument, recordRecentDocument]);

  const visibleItems = useMemo(() => {
    if (!currentDocument) {
      return items.slice(0, limit);
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
                    <AppLink href={toDocHref(item.relativePath)} className="search-result-title">
                      {item.title}
                    </AppLink>
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
