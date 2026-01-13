/**
 * @file view-mindmap-modal.tsx
 * @brief View mindmap modal component
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  FileJson,
  FileText,
  ImageIcon,
  FileType,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MindmapRenderer } from '@/components/tools/markmap';
import { subjectIcons } from '@/data';
import type { ExportFormat } from '@/lib/tools/mindmap-export';
import type { SavedMindmap } from '@/lib/hooks/use-saved-materials';

interface ViewMindmapModalProps {
  mindmap: SavedMindmap | null;
  onClose: () => void;
  onExport: (mindmap: SavedMindmap, format: ExportFormat) => void;
}

export function ViewMindmapModal({
  mindmap,
  onClose,
  onExport,
}: ViewMindmapModalProps) {
  if (!mindmap) return null;

  return (
    <AnimatePresence>
      {mindmap && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-xl">{subjectIcons[mindmap.subject]}</span>
                <h3 className="text-xl font-bold">{mindmap.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Esporta
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onExport(mindmap, 'json')}
                    >
                      <FileJson className="w-4 h-4 mr-2" />
                      JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onExport(mindmap, 'markdown')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Markdown
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onExport(mindmap, 'svg')}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      SVG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onExport(mindmap, 'png')}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onExport(mindmap, 'pdf')}
                    >
                      <FileType className="w-4 h-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onExport(mindmap, 'freemind')}
                    >
                      <Network className="w-4 h-4 mr-2" />
                      FreeMind (.mm)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onExport(mindmap, 'xmind')}
                    >
                      <Network className="w-4 h-4 mr-2" />
                      XMind
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  onClick={onClose}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <MindmapRenderer
                title={mindmap.title}
                markdown={mindmap.markdown}
                nodes={mindmap.nodes}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

