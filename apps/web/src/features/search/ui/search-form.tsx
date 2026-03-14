'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { isDesktopRenderer } from '@/platform/desktop/renderer/desktop-api';
import { getDesktopHashHref } from '@/shared/lib/app-routes';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export function SearchForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const nextPathname = usePathname();
  const nextSearchParams = useSearchParams();
  const desktop = isDesktopRenderer();
  const [desktopQuery, setDesktopQuery] = useState('');
  const [desktopPathname, setDesktopPathname] = useState('/');
  const currentQuery = desktop ? desktopQuery : nextSearchParams?.get('q') ?? '';
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    if (!desktop) {
      return;
    }

    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '') || '/';
      const [pathname, search = ''] = hash.split('?');
      setDesktopPathname(pathname || '/');
      setDesktopQuery(new URLSearchParams(search).get('q') ?? '');
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [desktop]);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    if (!desktop) {
      return;
    }

    const focusSearchInput = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener('markdeck:focus-search-input', focusSearchInput as EventListener);
    return () => window.removeEventListener('markdeck:focus-search-input', focusSearchInput as EventListener);
  }, [desktop]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const href = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search';

    if (desktop) {
      window.location.hash = getDesktopHashHref(href).replace('/#', '#');
      return;
    }

    router.push(href);
  }

  const isSearchPage = desktop ? desktopPathname === '/search' : nextPathname === '/search';

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={isSearchPage ? '검색어를 입력하세요' : '문서 검색'}
        className="search-input"
        aria-label="Search markdown documents"
      />
      <Button type="submit" variant="outline" className="search-button">
        <Search className="size-4" />
        <span>Search</span>
      </Button>
    </form>
  );
}
