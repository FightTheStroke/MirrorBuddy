'use client';

import { useReducer, useCallback } from 'react';
import { Pencil, PencilRuler, FolderUp, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { ToolCard } from './tool-card';
import { AstuccioInfoSection } from './astuccio-info-section';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { StudyKitView } from '@/components/study-kit/StudyKitView';
import type { ToolType } from '@/types/tools';
import type { Maestro } from '@/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import {
  TOOL_CATEGORIES,
  getToolsByCategory,
  toolRequiresMaestro,
} from '@/lib/tools/constants';

// ============================================================================
// STATE MANAGEMENT - Unified with useReducer
// ============================================================================

type DialogState = 'closed' | 'selecting_maestro' | 'study_kit';

interface AstuccioState {
  selectedToolType: ToolType | null;
  dialogState: DialogState;
}

type AstuccioAction =
  | { type: 'SELECT_TOOL'; toolType: ToolType }
  | { type: 'OPEN_STUDY_KIT' }
  | { type: 'CONFIRM_MAESTRO' }
  | { type: 'CLOSE_DIALOG' }
  | { type: 'RESET' };

const initialState: AstuccioState = {
  selectedToolType: null,
  dialogState: 'closed',
};

function astuccioReducer(state: AstuccioState, action: AstuccioAction): AstuccioState {
  switch (action.type) {
    case 'SELECT_TOOL':
      return {
        selectedToolType: action.toolType,
        dialogState: 'selecting_maestro',
      };
    case 'OPEN_STUDY_KIT':
      return {
        selectedToolType: 'study-kit',
        dialogState: 'study_kit',
      };
    case 'CONFIRM_MAESTRO':
    case 'CLOSE_DIALOG':
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const categoryVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_ICONS = {
  upload: FolderUp,
  create: Pencil,
  search: Globe,
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

interface AstuccioViewProps {
  onToolRequest?: (toolType: ToolType, maestro: Maestro) => void;
}

export function AstuccioView({ onToolRequest }: AstuccioViewProps) {
  const [state, dispatch] = useReducer(astuccioReducer, initialState);

  const handleToolClick = useCallback((toolType: ToolType) => {
    // Study Kit has its own flow (no maestro selection)
    if (!toolRequiresMaestro(toolType)) {
      dispatch({ type: 'OPEN_STUDY_KIT' });
      return;
    }
    dispatch({ type: 'SELECT_TOOL', toolType });
  }, []);

  const handleMaestroConfirm = useCallback((maestro: Maestro, _mode: 'voice' | 'chat') => {
    if (state.selectedToolType && onToolRequest) {
      onToolRequest(state.selectedToolType, maestro);
    }
    dispatch({ type: 'CONFIRM_MAESTRO' });
  }, [state.selectedToolType, onToolRequest]);

  const handleDialogClose = useCallback(() => {
    dispatch({ type: 'CLOSE_DIALOG' });
  }, []);

  // Show Study Kit view if selected
  if (state.dialogState === 'study_kit') {
    return (
      <div className="container mx-auto px-4 max-w-7xl">
        <button
          onClick={handleDialogClose}
          className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2"
        >
          ← Torna all&apos;Astuccio
        </button>
        <StudyKitView />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <PageHeader icon={PencilRuler} title="Astuccio" />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
        {TOOL_CATEGORIES.map((category) => {
          const CategoryIcon = CATEGORY_ICONS[category.category];
          const tools = getToolsByCategory(category.category);

          return (
            <motion.section key={category.id} variants={categoryVariants} className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/50 border-border">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-card shadow-sm">
                  <CategoryIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{category.title}</h2>
                  <p className="text-sm text-muted-foreground">{category.subtitle}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-card border text-foreground">
                    {tools.length} strumenti
                  </span>
                </div>
              </div>
              <div className={cn(
                'grid gap-4',
                tools.length === 1
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                  : tools.length <= 3
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
              )}>
                {tools.map((tool, index) => (
                  <motion.div
                    key={tool.type}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ToolCard
                      title={tool.label}
                      description={tool.description}
                      icon={tool.icon}
                      onClick={() => handleToolClick(tool.type)}
                      isActive={state.selectedToolType === tool.type}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        })}
      </motion.div>

      <AstuccioInfoSection />

      <ToolMaestroSelectionDialog
        isOpen={state.dialogState === 'selecting_maestro'}
        toolType={state.selectedToolType ?? 'mindmap'}
        onConfirm={handleMaestroConfirm}
        onClose={handleDialogClose}
      />
    </div>
  );
}
