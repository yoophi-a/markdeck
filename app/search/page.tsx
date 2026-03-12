import Link from 'next/link';
import type { Route } from 'next';

import { SearchForm } from '@/components/SearchForm';
import { searchMarkdownDocuments } from '@/lib/content';
import { toDocHref } from '@/lib/routes';
import { formatDateTime, formatFileSize } from '@/lib/format';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q?.trim() ?? '';
  const results = query ? await searchMarkdownDocuments(query) : [];

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
                      {result.title}
                    </Link>
                    <span className="muted mono">{result.relativePath}</span>
                    <p className="search-result-snippet">{result.snippet}</p>
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
