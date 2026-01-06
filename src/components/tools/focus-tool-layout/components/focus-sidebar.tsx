/**
 * @file focus-sidebar.tsx
 * @brief Focus sidebar component
 */

import Image from 'next/image';
import { X, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_ITEMS } from '../constants';

interface FocusSidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onExit: () => void;
}

export function FocusSidebar({
  expanded,
  onExpandedChange,
  onExit,
}: FocusSidebarProps) {
  return (
    <aside
      className={cn(
        'h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col',
        expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED
      )}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      <div className="h-14 flex items-center gap-2 px-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <Image
          src="/logo-brain.png"
          alt="MirrorBuddy"
          width={32}
          height={32}
          className="object-contain flex-shrink-0"
        />
        {expanded && (
          <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
            MirrorBuddy
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onExpandedChange(!expanded)}
          className="text-slate-500 ml-auto"
          aria-label={expanded ? 'Riduci menu' : 'Espandi menu'}
        >
          {expanded ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={onExit}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            title={item.label}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {expanded && (
              <span className="text-sm font-medium whitespace-nowrap">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <button
          onClick={onExit}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Esci dalla modalità strumento"
        >
          <X className="h-5 w-5 flex-shrink-0" />
          {expanded && <span className="text-sm font-medium">Esci</span>}
        </button>
      </div>
    </aside>
  );
}

