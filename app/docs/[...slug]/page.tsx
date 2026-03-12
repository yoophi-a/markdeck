import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';

import { MarkdownView } from '@/components/MarkdownView';
import { joinSegments } from '@/lib/format';
import { readMarkdownDocument, toBrowseHref } from '@/lib/content';

export default async function DocumentPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  const slug = joinSegments(resolvedParams);

  try {
    const document = await readMarkdownDocument(slug);
    const directoryPath = slug.slice(0, -1).join('/');

    return (
      <section className="stack">
        <div className="card">
          <p className="eyebrow">Document</p>
          <h1>{document.title}</h1>
          <p className="muted mono">{document.relativePath}</p>
          <div className="actions">
            <Link href={toBrowseHref(directoryPath) as Route} className="button-link secondary">
              폴더로 돌아가기
            </Link>
          </div>
        </div>

        <article className="card markdown-body">
          <MarkdownView content={document.content} currentRelativePath={document.relativePath} />
        </article>
      </section>
    );
  } catch {
    notFound();
  }
}
