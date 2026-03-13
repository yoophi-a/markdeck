import Link from 'next/link';
import type { Route } from 'next';

import { getContentRoot, getIgnorePatterns } from '@/shared/lib/content';
import { toBrowseHref } from '@/shared/lib/routes';
import { PinnedDocuments } from '@/widgets/document/pinned-documents';
import { RecentDocuments } from '@/widgets/document/recent-documents';
import { SessionResumeCard } from '@/widgets/navigation/session-resume-card';

export default function HomePage() {
  const contentRoot = getContentRoot();

  return (
    <section className="stack web-home-page">
      <div className="hero-card">
        <p className="eyebrow">Project</p>
        <h1>MarkDeck</h1>
        <p>openclaw-workspace 안의 markdown 문서를 폴더처럼 탐색하고, 문서를 읽고, 문서 안 링크를 따라 이동할 수 있는 웹 뷰어다.</p>
      </div>

      <div className="grid two-up">
        <article className="card">
          <h2>핵심 기능</h2>
          <ul>
            <li>파일/폴더 브라우징</li>
            <li>Markdown 렌더링</li>
            <li>최근 본 문서 목록</li>
            <li>문서 heading 기반 목차</li>
            <li>Obsidian-style WikiLink 지원</li>
            <li>문서 간 상대 링크 이동</li>
            <li>ignore pattern 기반 숨김 처리</li>
            <li>full-text search</li>
            <li>dark / light theme 전환</li>
            <li>content root 경로 제한</li>
          </ul>
        </article>

        <article className="card">
          <h2>현재 설정</h2>
          <p>
            <strong>content root</strong>
          </p>
          <code>{contentRoot}</code>
          <p className="muted">환경변수 `MARKDECK_CONTENT_ROOT`를 지정하지 않으면 현재 앱 작업 디렉터리를 기준으로 동작합니다.</p>
          <p>
            <strong>ignore patterns</strong>
          </p>
          <code>{getIgnorePatterns().join(', ')}</code>
          <div className="actions">
            <Link href={toBrowseHref() as Route} className="button-link">
              문서 둘러보기
            </Link>
            <Link href={'/search' as Route} className="button-link secondary">
              문서 검색
            </Link>
          </div>
        </article>
      </div>

      <SessionResumeCard contentRootKey="web" />

      <PinnedDocuments />
      <RecentDocuments />
    </section>
  );
}
