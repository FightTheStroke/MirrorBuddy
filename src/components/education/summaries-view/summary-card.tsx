'use client';

import { FileText, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SummaryData } from '@/types/tools';

interface SavedToolItem {
  toolId: string;
  title?: string;
  content: unknown;
  createdAt: Date | string;
}

interface SummaryCardProps {
  tool: SavedToolItem;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function SummaryCard({ tool, onClick, onDelete }: SummaryCardProps) {
  const summaryData = tool.content as unknown as SummaryData;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">
                {tool.title || summaryData.topic || 'Riassunto'}
              </CardTitle>
              <p className="text-xs text-slate-500">
                {new Date(tool.createdAt).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tool.toolId);
            }}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {summaryData.sections?.slice(0, 3).map((section, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              {section.title}
            </span>
          ))}
          {(summaryData.sections?.length || 0) > 3 && (
            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              +{(summaryData.sections?.length || 0) - 3}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
