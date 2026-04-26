'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, BookOpen, Wrench, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaestroInfo {
  id: string;
  displayName: string;
  subject: string;
  toolsCount: number;
}

export function KnowledgeViewer({ maestri }: { maestri: MaestroInfo[] }) {
  const t = useTranslations('admin');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadKnowledge = useCallback(
    async (id: string) => {
      if (content[id]) return;
      setLoadingId(id);
      try {
        const res = await fetch(`/api/admin/knowledge/${id}`);
        if (res.ok) {
          const data = await res.json();
          setContent((prev) => ({ ...prev, [id]: data.systemPrompt }));
        }
      } catch {
        // silent
      } finally {
        setLoadingId(null);
      }
    },
    [content],
  );

  const handleToggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      void loadKnowledge(id);
    }
  };

  const filtered = maestri.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.displayName.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder={t('knowledge.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-xs text-slate-500">
        {t('knowledge.count', { filtered: filtered.length, total: maestri.length })}
      </p>

      <div className="space-y-2">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => handleToggle(m.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {m.displayName}
                  </p>
                  <p className="text-[10px] text-slate-500">{m.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  {m.toolsCount}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-slate-400 transition-transform',
                    expandedId === m.id && 'rotate-180',
                  )}
                />
              </div>
            </button>
            {expandedId === m.id && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/30">
                {loadingId === m.id ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                    {content[m.id] ?? t('knowledge.contentUnavailable')}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            {t('knowledge.noResults', { search })}
          </p>
        )}
      </div>
    </div>
  );
}
