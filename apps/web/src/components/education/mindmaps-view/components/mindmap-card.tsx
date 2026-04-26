/**
 * @file mindmap-card.tsx
 * @brief Mindmap card component
 */

import { Trash2, Network } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subjectColors } from '@/data';
import type { SavedMindmap } from '@/lib/hooks/use-saved-materials';

interface MindmapCardProps {
  mindmap: SavedMindmap;
  onSelect: () => void;
  onDelete: () => void;
}

export function MindmapCard({
  mindmap,
  onSelect,
  onDelete,
}: MindmapCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${subjectColors[mindmap.subject]}20`,
              }}
            >
              <Network
                className="w-5 h-5"
                style={{ color: subjectColors[mindmap.subject] }}
              />
            </div>
            <div>
              <CardTitle className="text-base">{mindmap.title}</CardTitle>
              <p className="text-xs text-slate-500">
                {new Date(mindmap.createdAt).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {mindmap.nodes.slice(0, 4).map((node, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              {node.label}
            </span>
          ))}
          {mindmap.nodes.length > 4 && (
            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              +{mindmap.nodes.length - 4}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

