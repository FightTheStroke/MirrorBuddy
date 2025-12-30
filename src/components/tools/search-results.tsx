'use client';

import Image from 'next/image';
import { ExternalLink, Youtube, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SearchResult {
  type: 'web' | 'youtube';
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  duration?: string; // YouTube only
}

interface SearchResultsProps {
  data: {
    query: string;
    results: SearchResult[];
  };
}

export function SearchResults({ data }: SearchResultsProps) {
  const { query, results } = data;

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        Nessun risultato trovato per &quot;{query}&quot;
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {results.length} risultati per &quot;{query}&quot;
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((result, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {result.thumbnail && (
                  <div className="relative mb-2 rounded-lg overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={result.thumbnail}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {result.type === 'youtube' && result.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {result.duration}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-2">
                  {result.type === 'youtube' ? (
                    <Youtube className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Globe className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 hover:text-primary text-slate-900 dark:text-white">
                      {result.title}
                    </h4>
                    {result.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </div>

                  <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </div>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
