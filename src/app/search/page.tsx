'use client';

import { Suspense } from 'react';
import { SearchResults } from '@/components/tools/search-results';
import type { SearchResult } from '@/types/tools';

export default function SearchPage() {
  const searchData = {
    query: '',
    results: [] as SearchResult[],
  };

  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <SearchResults data={searchData} />
      </Suspense>
    </main>
  );
}
