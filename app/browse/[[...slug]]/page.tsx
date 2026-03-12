import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';

import { BrowserList } from '@/components/BrowserList';
import { joinSegments, prettyPath } from '@/lib/format';
import { listDirectory, toBrowseHref } from '@/lib/content';

export default async function BrowsePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const slug = joinSegments(resolvedParams);

  try {
    const entries = await listDirectory(slug);
    const parentSegments = slug.slice(0, -1);

    return (
      <section className="stack">
        <div className="card">
          <p className="eyebrow">Browse</p>
          <h1>{prettyPath(slug.join('/'))}</h1>
          <div className="breadcrumb-row">
            <Link href={'/' as Route}>Home</Link>
            <span>/</span>
            <Link href={'/browse' as Route}>browse</Link>
            {slug.length > 0 && (
              <>
                <span>/</span>
                <Link href={toBrowseHref(parentSegments.join('/')) as Route}>up</Link>
              </>
            )}
          </div>
        </div>

        <div className="card">
          {entries.length > 0 ? <BrowserList entries={entries} /> : <p className="muted">표시할 파일이 없다.</p>}
        </div>
      </section>
    );
  } catch {
    notFound();
  }
}
