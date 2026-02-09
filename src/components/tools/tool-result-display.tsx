'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ToolCall } from '@/types';
import { toolIcons, toolNames, FUNCTION_NAME_TO_TOOL_TYPE } from './tool-display-constants';
import { ToolContent } from './tool-content-renderers';
import { useTranslations } from "next-intl";

interface ToolResultDisplayProps {
  toolCall: ToolCall;
  className?: string;
  /** Session ID for real-time mindmap modifications (Maestro+Student collaboration) */
  sessionId?: string | null;
  /** Whether this tool is in fullscreen mode */
  isFullscreen?: boolean;
  /** Callback to toggle fullscreen mode */
  onToggleFullscreen?: () => void;
}

export function ToolResultDisplay({ toolCall, className, sessionId, isFullscreen = false, onToggleFullscreen }: ToolResultDisplayProps) {
  const t = useTranslations("tools");
  // Map function name to tool type for display
  const toolType = FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || toolCall.type;
  const icon = toolIcons[toolCall.type] || toolIcons[toolType] || <Loader2 className="w-4 h-4" />;
  const name = toolNames[toolCall.type] || toolNames[toolType] || toolCall.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'space-y-2 w-full',
        isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-slate-950 p-6 overflow-auto',
        className
      )}
      role="region"
      aria-label={t("toolResult", { name })}
    >
      {/* Status header */}
      <div className={cn(
        'flex items-center justify-between gap-2 text-sm',
        isFullscreen && 'sticky top-0 z-10 bg-white dark:bg-slate-950 pb-4 border-b border-slate-200 dark:border-slate-700 mb-4'
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('text-slate-400', isFullscreen && 'text-slate-600 dark:text-slate-300')}>{icon}</span>
          <span className={cn('font-medium text-slate-300', isFullscreen && 'text-slate-900 dark:text-white text-lg')}>{name}</span>
          <StatusBadge status={toolCall.status} />
        </div>
        {toolCall.status === 'completed' && onToggleFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className={cn(
              'text-slate-400 hover:text-slate-200',
              isFullscreen && 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
            title={isFullscreen ? t("riduci") : t("espandi")}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Tool-specific content */}
      <AnimatePresence mode="wait">
        {toolCall.status === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700"
          >
            <span className="text-sm text-slate-400">{t("waitingToExecute")}</span>
          </motion.div>
        )}

        {toolCall.status === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700"
          >
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </motion.div>
        )}

        {(toolCall.status === 'completed' || toolCall.status === 'error') && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              isFullscreen && 'h-full flex flex-col'
            )}
          >
            <div className={cn(
              isFullscreen && 'flex-1 overflow-auto'
            )}>
              <ToolContent toolCall={toolCall} sessionId={sessionId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: ToolCall['status'] }) {
  const t = useTranslations("tools");
  switch (status) {
    case 'pending':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-400">
          {t("pending")}
        </span>
      );
    case 'running':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/50 text-blue-400 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("running")}
        </span>
      );
    case 'completed':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {t("complete")}
        </span>
      );
    case 'error':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-400 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          {t("error")}
        </span>
      );
  }
}


// Multiple tools display
interface ToolResultsListProps {
  toolCalls: ToolCall[];
  className?: string;
  /** Session ID for real-time mindmap modifications (Maestro+Student collaboration) */
  sessionId?: string | null;
}

export function ToolResultsList({ toolCalls, className, sessionId }: ToolResultsListProps) {
  const t = useTranslations("tools");
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)} role="list" aria-label={t("toolResults")}>
      <AnimatePresence>
        {toolCalls.map((toolCall) => (
          <ToolResultDisplay key={toolCall.id} toolCall={toolCall} sessionId={sessionId} />
        ))}
      </AnimatePresence>
    </div>
  );
}
