'use client';

/**
 * ToolResultDisplay Component
 * Displays tool execution results with status and content
 *
 * Split for maintainability - see subcomponents for details
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Code, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toolIcons, toolNames } from './constants';
import { StatusBadge } from './status-badge';
import { ToolContent } from './tool-content';
import { FUNCTION_NAME_TO_TOOL_TYPE } from '@/components/conversation/constants/tool-constants';
import type { ToolCall, ToolCallRef } from '@/types';
import type { ToolType } from '@/types/tools';

interface ToolResultDisplayProps {
  /** Tool call - can be full ToolCall (from chat) or lightweight ToolCallRef (from DB) */
  toolCall: ToolCall | ToolCallRef;
  className?: string;
  /** Session ID for real-time mindmap modifications */
  sessionId?: string | null;
  /** Whether this tool is in fullscreen mode */
  isFullscreen?: boolean;
  /** Callback to toggle fullscreen mode */
  onToggleFullscreen?: () => void;
}

export function ToolResultDisplay({
  toolCall,
  className,
  sessionId,
  isFullscreen = false,
  onToggleFullscreen,
}: ToolResultDisplayProps) {
  // Map function name to tool type for display
  const toolType = FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || toolCall.type as ToolType;
  const icon = toolIcons[toolCall.type] || toolIcons[toolType] || <Code className="w-4 h-4" />;
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
      aria-label={`Tool result: ${name}`}
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
            title={isFullscreen ? 'Riduci' : 'Espandi'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
            <span className="text-sm text-slate-400">Waiting to execute...</span>
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
            className={cn(isFullscreen && 'h-full flex flex-col')}
          >
            <div className={cn(isFullscreen && 'flex-1 overflow-auto')}>
              <ToolContent toolCall={toolCall} sessionId={sessionId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Multiple tools display
interface ToolResultsListProps {
  toolCalls: (ToolCall | ToolCallRef)[];
  className?: string;
  sessionId?: string | null;
}

export function ToolResultsList({ toolCalls, className, sessionId }: ToolResultsListProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)} role="list" aria-label="Tool results">
      <AnimatePresence>
        {toolCalls.map((toolCall) => (
          <ToolResultDisplay key={toolCall.id} toolCall={toolCall} sessionId={sessionId} />
        ))}
      </AnimatePresence>
    </div>
  );
}
