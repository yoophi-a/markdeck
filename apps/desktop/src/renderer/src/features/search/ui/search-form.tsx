import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export function SearchForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentQuery = new URLSearchParams(location.search).get('q') ?? '';
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const focusSearchInput = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener('markdeck:focus-search-input', focusSearchInput as EventListener);
    return () => window.removeEventListener('markdeck:focus-search-input', focusSearchInput as EventListener);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const href = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search';
    navigate(href);
  }

  const isSearchPage = location.pathname === '/search';

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
      <Button type="submit" variant="outline" size="icon-sm" title="Search" aria-label="Search">
        <Search className="size-4" />
      </Button>
    </form>
  );
}
