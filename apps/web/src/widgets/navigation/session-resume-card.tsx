'use client';

import { History } from 'lucide-react';
import { useEffect, useState } from 'react';

import { readLastBrowseState, readLastDocumentState } from '@/shared/lib/view-state';
import { toBrowseHref, toDocHref } from '@/shared/lib/routes';
import { AppLink } from '@/shared/ui/app-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

interface SessionResumeCardProps {
  contentRootKey: string;
}

export function SessionResumeCard({ contentRootKey }: SessionResumeCardProps) {
  const [lastDocument, setLastDocument] = useState(() => readLastDocumentState(contentRootKey));
  const [lastBrowse, setLastBrowse] = useState(() => readLastBrowseState(contentRootKey));

  useEffect(() => {
    setLastDocument(readLastDocumentState(contentRootKey));
    setLastBrowse(readLastBrowseState(contentRootKey));
  }, [contentRootKey]);

  if (!lastDocument && !lastBrowse) {
    return null;
  }

  return (
    <Card className="stack">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          이어서 보기
        </CardTitle>
        <CardDescription>마지막으로 보던 문서와 탐색 위치를 다시 열 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid two-up">
        <article className="card stack">
          <div>
            <p className="eyebrow">Document</p>
            <h2>마지막 문서</h2>
          </div>
          {lastDocument ? (
            <>
              <AppLink href={toDocHref(lastDocument.relativePath)} className="search-result-title">
                {lastDocument.title}
              </AppLink>
              <p className="muted mono">{lastDocument.relativePath}</p>
            </>
          ) : (
            <p className="muted">아직 기록된 문서가 없습니다.</p>
          )}
        </article>

        <article className="card stack">
          <div>
            <p className="eyebrow">Browse</p>
            <h2>마지막 위치</h2>
          </div>
          {lastBrowse ? (
            <>
              <AppLink href={toBrowseHref(lastBrowse.relativePath)} className="search-result-title">
                {lastBrowse.relativePath || '/'}
              </AppLink>
              <p className="muted">이전 탐색 위치로 돌아갑니다.</p>
            </>
          ) : (
            <p className="muted">아직 기록된 탐색 위치가 없습니다.</p>
          )}
        </article>
      </CardContent>
    </Card>
  );
}
