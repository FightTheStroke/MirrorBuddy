/**
 * Knowledge Hub Selection Status Bar
 * Shows selected materials count and bulk actions
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface SelectionStatusBarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onDelete?: () => Promise<void>;
}

export function SelectionStatusBar({
  selectedCount,
  onDeselectAll,
  onDelete,
}: SelectionStatusBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-lg flex items-center gap-4"
        >
          <span className="text-sm">
            {selectedCount} materiali selezionati
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onDeselectAll}
            >
              Deseleziona
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
              >
                Elimina
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
