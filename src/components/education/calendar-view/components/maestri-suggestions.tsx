"use client";

/**
 * @file maestri-suggestions.tsx
 * @brief Maestri suggestions card component
 */

import { motion } from 'framer-motion';
import { Lightbulb, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { maestri as MAESTRI } from '@/data/maestri';
import { useTranslations } from "next-intl";

interface MaestroSuggestion {
  maestroId: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface MaestriSuggestionsProps {
  suggestions: MaestroSuggestion[];
}

export function MaestriSuggestions({ suggestions }: MaestriSuggestionsProps) {
  const t = useTranslations("education");
  if (suggestions.length === 0) return null;

  const getMaestroById = (id: string) => {
    return MAESTRI.find((m) => m.id === id);
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          {t("maestriConsigliati")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {suggestions.slice(0, 3).map((suggestion) => {
            const maestro = getMaestroById(suggestion.maestroId);
            if (!maestro) return null;

            return (
              <motion.div
                key={suggestion.maestroId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm',
                  suggestion.priority === 'high' && 'ring-2 ring-red-500',
                  suggestion.priority === 'medium' && 'ring-2 ring-amber-500'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                  {maestro.displayName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {maestro.displayName}
                  </p>
                  <p className="text-xs text-slate-500">{suggestion.reason}</p>
                </div>
                {suggestion.priority === 'high' && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

