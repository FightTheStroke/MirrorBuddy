'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActiveMaestroAvatar } from '@/components/conversation';
import { debugPages } from './home-constants';
import type { View } from '@/app/types';

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
  isChat?: boolean;
  avatar?: string;
}

interface HomeSidebarProps {
  open: boolean;
  onToggle: () => void;
  currentView: View;
  onViewChange: (view: View) => Promise<void>;
  navItems: NavItem[];
  hasNewInsights: boolean;
  onParentAccess: () => void;
  selectedCoach: string;
  selectedBuddy: string;
  debugMenuOpen: boolean;
  onDebugMenuToggle: () => void;
}

export function HomeSidebar({
  open,
  onToggle,
  currentView,
  onViewChange,
  navItems,
  hasNewInsights,
  onParentAccess,
  debugMenuOpen,
  onDebugMenuToggle,
}: HomeSidebarProps) {
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-300',
        open ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo - clickable to return home */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onViewChange('maestri')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          aria-label="Torna alla home"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src="/logo-brain.png"
              alt="MirrorBuddy"
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </div>
          {open && (
            <span className="font-bold text-lg text-slate-900 dark:text-white">
              MirrorBuddy
            </span>
          )}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-slate-500"
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 overflow-y-auto pb-24" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {navItems.map((item) => {
          const isChatItem = item.id === 'coach' || item.id === 'buddy';
          const avatarSrc = 'avatar' in item ? item.avatar : null;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                currentView === item.id
                  ? 'bg-accent-themed text-white shadow-lg'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                isChatItem && 'relative'
              )}
              style={currentView === item.id ? { boxShadow: '0 10px 15px -3px var(--accent-color, #3b82f6)40' } : undefined}
            >
              {avatarSrc ? (
                <div className="relative flex-shrink-0">
                  <Image
                    src={avatarSrc}
                    alt={item.label}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>
              ) : (
                <div className="relative flex-shrink-0">
                  <item.icon className="h-5 w-5" />
                </div>
              )}
              {open && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* DEBUG MENU */}
      <div className="px-2 pb-2">
        <button
          onClick={onDebugMenuToggle}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs',
            debugMenuOpen
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          <span className="font-bold">DEBUG MENU</span>
          {debugMenuOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {debugMenuOpen && (
          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
            <div className="text-xs text-slate-400 mb-2 font-bold">TUTTE LE PAGINE:</div>
            {debugPages.map((page, idx) => {
              const isRedirect = page.status === 'redirect';
              const isDead = page.status === 'dead';

              return (
                <a
                  key={page.href}
                  href={page.href}
                  target="_self"
                  className={cn(
                    'block px-2 py-1.5 rounded-lg text-xs mb-1 transition-colors',
                    isDead
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100'
                      : isRedirect
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  )}
                >
                  <span className="font-bold">[{idx + 1}]</span> {page.href}
                  {page.note && <span className="ml-2 opacity-75">- {page.note}</span>}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Maestro Avatar */}
      <div className="px-4 mb-2">
        <ActiveMaestroAvatar onReturnToMaestro={() => onViewChange('maestro-session')} />
      </div>

      {/* Parent Access Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          onClick={onParentAccess}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
            'bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-800/50',
            'border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300',
            'text-sm font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            'relative'
          )}
        >
          <span className="relative">
            👥
            {hasNewInsights && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </span>
          {open && <span>Area Genitori</span>}
        </button>
      </div>
    </aside>
  );
}
