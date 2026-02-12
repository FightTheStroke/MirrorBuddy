'use client';

import { useReducer, useCallback } from 'react';
import { Pencil, PencilRuler, FolderUp, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { nanoid } from 'nanoid';
import { toast } from '@/components/ui/toast';
import { clientLogger as logger } from '@/lib/logger/client';
import { ToolCard } from './tool-card';
import { AstuccioInfoSection } from './astuccio-info-section';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { StudyKitView } from '@/components/study-kit/StudyKitView';
import { TypingView } from '@/components/typing/TypingView';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import { forceSaveMaterial } from '@/lib/hooks/use-saved-materials';
import type { ToolType } from '@/types/tools';
import type { Maestro } from '@/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { TOOL_CATEGORIES, getToolsByCategory, toolRequiresMaestro } from '@/lib/tools/constants';

// ============================================================================
// STATE MANAGEMENT - Unified with useReducer
// ============================================================================

type DialogState = 'closed' | 'selecting_maestro' | 'study_kit' | 'typing' | 'webcam_standalone';

interface AstuccioState {
  selectedToolType: ToolType | null;
  dialogState: DialogState;
}

type AstuccioAction =
  | { type: 'SELECT_TOOL'; toolType: ToolType }
  | { type: 'OPEN_STANDALONE_TOOL'; toolType: ToolType }
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
    case 'OPEN_STANDALONE_TOOL':
      // Map tool type to appropriate dialog state
      const dialogStateMap: Record<string, DialogState> = {
        'study-kit': 'study_kit',
        typing: 'typing',
        'webcam-standalone': 'webcam_standalone',
      };
      return {
        selectedToolType: action.toolType,
        dialogState: dialogStateMap[action.toolType] || 'closed',
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
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  },
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

export function AstuccioView({ onToolRequest: _onToolRequest }: AstuccioViewProps) {
  const t = useTranslations('tools.astuccio');
  const tTools = useTranslations('tools');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [state, dispatch] = useReducer(astuccioReducer, initialState);

  const getToolI18nKey = useCallback((toolType: ToolType) => {
    // Tool i18n keys are camelCase in messages (ADR 0091).
    // ToolType includes kebab-case values (e.g., "study-kit") which must be mapped.
    return toolType.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }, []);

  const handleToolClick = useCallback((toolType: ToolType) => {
    // Standalone tools have their own flow (no maestro selection)
    if (!toolRequiresMaestro(toolType)) {
      dispatch({ type: 'OPEN_STANDALONE_TOOL', toolType });
      return;
    }
    dispatch({ type: 'SELECT_TOOL', toolType });
  }, []);

  const handleMaestroConfirm = useCallback(
    (maestro: Maestro, _mode: 'voice' | 'chat') => {
      if (state.selectedToolType) {
        router.push(`/${locale}/maestri/${maestro.id}?tool=${state.selectedToolType}`);
      }
      dispatch({ type: 'CONFIRM_MAESTRO' });
    },
    [state.selectedToolType, router, locale],
  );

  const handleDialogClose = useCallback(() => {
    dispatch({ type: 'CLOSE_DIALOG' });
  }, []);

  const handleWebcamCapture = useCallback(
    async (imageBase64: string) => {
      try {
        const toolId = nanoid();
        const timestamp = new Date().toISOString();
        const title = t('webcamStandalone.savedTitle', {
          date: new Date().toLocaleDateString(),
        });

        const content = {
          imageBase64,
          extractedText: '',
          imageDescription: '',
          analysisTimestamp: timestamp,
        };

        const success = await forceSaveMaterial('webcam', title, content, {
          toolId,
        });

        if (success) {
          toast.success(t('webcamStandalone.saveSuccess'));
          dispatch({ type: 'CLOSE_DIALOG' });
        } else {
          toast.error(t('webcamStandalone.saveError'));
        }
      } catch (error) {
        logger.error('Error saving webcam capture', undefined, error);
        toast.error(t('webcamStandalone.saveError'));
      }
    },
    [t],
  );

  // Show Study Kit view if selected
  if (state.dialogState === 'study_kit') {
    return (
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <button
          onClick={handleDialogClose}
          className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2"
        >
          {t('backToAstuccio')}
        </button>
        <StudyKitView />
      </div>
    );
  }

  // Show Typing view if selected
  if (state.dialogState === 'typing') {
    return (
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <button
          onClick={handleDialogClose}
          className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2"
        >
          {t('backToAstuccio')}
        </button>
        <TypingView />
      </div>
    );
  }

  // Show WebcamCapture if webcam-standalone is selected
  if (state.dialogState === 'webcam_standalone') {
    return (
      <WebcamCapture
        purpose={t('webcamStandalone.purpose')}
        instructions={t('webcamStandalone.instructions')}
        onCapture={handleWebcamCapture}
        onClose={handleDialogClose}
        showTimer={true}
      />
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
      <PageHeader icon={PencilRuler} title={t('title')} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
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
                  <h2 className="text-xl font-bold text-foreground">
                    {t(`categories.${category.category}.title`)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t(`categories.${category.category}.subtitle`)}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-card border text-foreground">
                    {t('toolsCount', { count: tools.length })}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  'grid gap-4',
                  tools.length === 1
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : tools.length <= 3
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
                )}
              >
                {tools.map((tool, index) => (
                  <motion.div
                    key={tool.type}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ToolCard
                      title={tTools(`${getToolI18nKey(tool.type)}.label`)}
                      description={tTools(`${getToolI18nKey(tool.type)}.description`)}
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
