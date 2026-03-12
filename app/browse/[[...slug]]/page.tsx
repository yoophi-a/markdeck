import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BrowserList } from '@/components/BrowserList';
import { joinSegments, prettyPath } from '@/lib/format';
import { listDirectory } from '@/lib/content';

export default async function BrowsePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const slug = joinSegments(resolvedParams);

  try {
    const entries = await listDirectory(slug);

    return (
      <section className="stack">
        <div className="card">
          <p className="eyebrow">Browse</p>
          <h1>{prettyPath(slug.join('/'))}</h1>
          <Breadcrumbs segments={slug} />
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
