import Link from 'next/link';
import type { Route } from 'next';

export default function NotFound() {
  return (
    <section className="card stack">
      <p className="eyebrow">404</p>
      <h1>문서를 찾지 못했다</h1>
      <p className="muted">경로가 잘못됐거나, markdown이 아닌 파일일 수 있다.</p>
      <div className="actions">
        <Link href={'/browse' as Route} className="button-link">
          브라우저로 이동
        </Link>
      </div>
    </section>
  );
}
