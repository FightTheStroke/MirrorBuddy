/**
 * @file tab-navigation.tsx
 * @brief Tab navigation component
 */

import { Calendar, CalendarDays, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewTab } from '../hooks/use-calendar-view';

interface TabNavigationProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'calendar' as const, label: 'Eventi', icon: Calendar },
    { id: 'schedule' as const, label: 'Piano Settimanale', icon: CalendarDays },
    { id: 'notifications' as const, label: 'Notifiche', icon: Bell },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === tab.id
              ? 'bg-accent-themed text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

