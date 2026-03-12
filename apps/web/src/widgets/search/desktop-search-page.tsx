'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { SearchForm } from '@/features/search/ui/search-form';
import { searchDesktopDocuments } from '@/platform/desktop/renderer/desktop-content';
import type { SearchResult } from '@/shared/lib/content-types';
import { formatDateTime, formatFileSize } from '@/shared/lib/format';
import { toDocHref } from '@/shared/lib/routes';

interface DesktopSearchPageProps {
  initialQuery: string;
  initialResults: SearchResult[];
}

export function DesktopSearchPage({ initialQuery, initialResults }: DesktopSearchPageProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? initialQuery;
  const [results, setResults] = useState(initialResults);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    void searchDesktopDocuments(query)
      .then((nextResults) => setResults(nextResults))
      .catch(() => undefined);
  }, [query]);

  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Search</p>
        <h1>문서 검색</h1>
        <p className="muted">파일명, 제목, 본문 내용을 기준으로 markdown 문서를 찾습니다.</p>
        <SearchForm />
      </div>

      {query ? (
        <div className="card stack">
          <p className="muted">
            검색어 <strong>{query}</strong> 결과 {results.length}건
          </p>
          {results.length > 0 ? (
            <ul className="search-results">
              {results.map((result) => (
                <li key={result.relativePath} className="search-result-item">
                  <div className="stack search-result-main">
                    <Link href={toDocHref(result.relativePath) as Route} className="search-result-title">
                      <HighlightedText text={result.title} query={query} />
                    </Link>
                    <span className="muted mono">
                      <HighlightedText text={result.relativePath} query={query} />
                    </span>
                    <p className="search-result-snippet">
                      <HighlightedText text={result.snippet} query={query} />
                    </p>
                  </div>
                  <div className="browser-entry-meta muted mono">
                    <span>{formatFileSize(result.size)}</span>
                    <span>{formatDateTime(result.updatedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">검색 결과가 없습니다.</p>
          )}
        </div>
      ) : (
        <div className="card">
          <p className="muted">검색어를 입력하면 결과를 보여드립니다.</p>
        </div>
      )}
    </section>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return text;
  }

  const segments = text.split(new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'gi'));

  return segments.map((segment, index) =>
    segment.toLowerCase() === normalizedQuery.toLowerCase() ? (
      <mark key={`${segment}-${index}`} className="search-highlight">
        {segment}
      </mark>
    ) : (
      segment
    )
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
