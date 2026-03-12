import { searchMarkdownDocuments } from '@/shared/lib/content';
import { DesktopSearchPage } from '@/widgets/search/desktop-search-page';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q?.trim() ?? '';
  const results = query ? await searchMarkdownDocuments(query) : [];

  return <DesktopSearchPage initialQuery={query} initialResults={results} />;
}
