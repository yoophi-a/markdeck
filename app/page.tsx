import Link from 'next/link';
import type { Route } from 'next';

import { getContentRoot, toBrowseHref } from '@/lib/content';

export default function HomePage() {
  return (
    <section className="stack">
      <div className="hero-card">
        <p className="eyebrow">Project</p>
        <h1>MarkDeck</h1>
        <p>
          openclaw-workspace 안의 markdown 문서를 폴더처럼 탐색하고, 문서를 읽고, 문서 안 링크를 따라 이동할 수 있는 웹 뷰어다.
        </p>
      </div>

      <div className="grid two-up">
        <article className="card">
          <h2>핵심 기능</h2>
          <ul>
            <li>파일/폴더 브라우징</li>
            <li>Markdown 렌더링</li>
            <li>상대 경로 링크 이동</li>
            <li>content root 경로 제한</li>
          </ul>
        </article>

        <article className="card">
          <h2>현재 content root</h2>
          <code>{getContentRoot()}</code>
          <div className="actions">
            <Link href={toBrowseHref() as Route} className="button-link">
              문서 둘러보기
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
