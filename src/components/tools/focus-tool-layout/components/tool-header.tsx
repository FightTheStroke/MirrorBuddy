/**
 * @file tool-header.tsx
 * @brief Tool header component
 */

import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOOL_NAMES } from '../constants';
import type { ToolType } from '@/types/tools';

interface ToolHeaderProps {
  toolType: ToolType | null;
  rightPanelCollapsed: boolean;
  onToggleRightPanel: () => void;
}

export function ToolHeader({
  toolType,
  rightPanelCollapsed,
  onToggleRightPanel,
}: ToolHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-900 dark:text-white">
          {toolType ? TOOL_NAMES[toolType] : 'Strumento'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">ESC per uscire</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleRightPanel}
          className="text-slate-500"
          aria-label={rightPanelCollapsed ? 'Mostra chat' : 'Nascondi chat'}
        >
          {rightPanelCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}

