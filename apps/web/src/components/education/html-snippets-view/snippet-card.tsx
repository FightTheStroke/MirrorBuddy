'use client';

import { motion } from 'framer-motion';
import { Code, Eye, ExternalLink, Trash2, Calendar, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SavedDemo } from '@/lib/hooks/use-saved-materials';
import { useTranslations } from "next-intl";

interface SnippetCardProps {
  demo: SavedDemo;
  maestroName?: string;
  onPreview: (demo: SavedDemo) => void;
  onOpenInNewTab: (demo: SavedDemo) => void;
  onDelete: (id: string) => void;
}

export function SnippetCard({
  demo,
  maestroName,
  onPreview,
  onOpenInNewTab,
  onDelete,
}: SnippetCardProps) {
  const t = useTranslations("education");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      layout
    >
      <Card className="h-full hover:shadow-lg transition-shadow group">
        {/* Preview thumbnail */}
        <div className="h-32 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <Code className="w-12 h-12 text-purple-300 dark:text-purple-600" />
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onPreview(demo)}
            >
              <Eye className="w-4 h-4 mr-1" />
              {t("anteprima")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenInNewTab(demo)}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
              {demo.title}
            </h3>
            <button
              onClick={() => onDelete(demo.id)}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {demo.description && (
            <p className="text-sm text-slate-500 line-clamp-2 mb-3">
              {demo.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {demo.subject && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {demo.subject}
              </span>
            )}
            {maestroName && (
              <span>{t("di")} {maestroName}</span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
            <Calendar className="w-3 h-3" />
            {new Date(demo.createdAt).toLocaleDateString('it-IT')}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
