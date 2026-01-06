'use client';

import { SearchResults } from '@/components/tools/search-results';
import type { SearchResult } from '@/types/tools';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function SearchPage() {
  const searchData = {
    query: '',
    results: [] as SearchResult[],
  };

  return (
    <ToolLayout
      title="Ricerca Web"
      subtitle="Cerca informazioni, video e risorse educative sul web"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <SearchResults data={searchData} />
    </ToolLayout>
  );
}
