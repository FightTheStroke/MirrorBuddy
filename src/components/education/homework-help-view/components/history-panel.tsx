import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Homework } from '@/types';

interface HistoryPanelProps {
  isOpen: boolean;
  history: Homework[];
  currentHomework: Homework | null;
  isLoading: boolean;
  onClose: () => void;
  onSelect: (homework: Homework) => void;
  onDelete: (id: string) => void;
}

export function HistoryPanel({
  isOpen,
  history,
  currentHomework,
  isLoading,
  onClose,
  onSelect,
  onDelete,
}: HistoryPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Cronologia</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Chiudi cronologia"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nessun problema salvato
                </p>
              ) : (
                history.map(hw => (
                  <div
                    key={hw.id}
                    className={cn(
                      'p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group',
                      currentHomework?.id === hw.id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    )}
                    onClick={() => onSelect(hw)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {hw.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {hw.steps.filter(s => s.completed).length}/{hw.steps.length} passaggi
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(hw.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {hw.completedAt && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(hw.id);
                          }}
                          aria-label="Elimina problema"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

