/**
 * @file mindmaps-grid.tsx
 * @brief Mindmaps grid component
 */

import { Loader2, Network, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { subjectNames, subjectIcons } from '@/data';
import type { Subject } from '@/types';
import type { SavedMindmap } from '@/lib/hooks/use-saved-materials';
import { MindmapCard } from './mindmap-card';

interface MindmapsGridProps {
  mindmaps: SavedMindmap[];
  loading: boolean;
  onSelectMindmap: (mindmap: SavedMindmap) => void;
  onDeleteMindmap: (id: string) => void;
  onShowExamples: () => void;
}

export function MindmapsGrid({
  mindmaps,
  loading,
  onSelectMindmap,
  onDeleteMindmap,
  onShowExamples,
}: MindmapsGridProps) {
  const mindmapsBySubject: Record<string, SavedMindmap[]> = {};
  mindmaps.forEach((m) => {
    if (!mindmapsBySubject[m.subject]) {
      mindmapsBySubject[m.subject] = [];
    }
    mindmapsBySubject[m.subject].push(m);
  });

  if (loading) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto text-slate-400 mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Caricamento...
          </h3>
        </div>
      </Card>
    );
  }

  if (mindmaps.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Network className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Nessuna mappa salvata
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Le mappe mentali create durante le sessioni vocali con i professori
            appariranno qui. Prova a chiedere a un professore di creare una mappa
            su un argomento!
          </p>
          <Button variant="outline" onClick={onShowExamples}>
            <Sparkles className="w-4 h-4 mr-2" />
            Esplora Esempi
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(mindmapsBySubject).map(([subject, maps]) => (
        <div key={subject}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{subjectIcons[subject as Subject]}</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {subjectNames[subject as Subject]}
            </h3>
            <span className="text-sm text-slate-500">({maps.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((mindmap) => (
              <MindmapCard
                key={mindmap.id}
                mindmap={mindmap}
                onSelect={() => onSelectMindmap(mindmap)}
                onDelete={() => onDeleteMindmap(mindmap.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

