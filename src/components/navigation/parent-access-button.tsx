'use client';

/**
 * Parent Access Button
 * Fixed button in bottom-left corner for quick access to parent dashboard
 * Replaces redundant XP bar in layout
 */

import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from "next-intl";

interface ParentAccessButtonProps {
  className?: string;
}

export function ParentAccessButton({ className }: ParentAccessButtonProps) {
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/parent-dashboard')}
      className={cn(
        'fixed bottom-4 left-4 z-40',
        'flex items-center gap-2',
        'px-3 py-2 sm:px-4 sm:py-2.5 rounded-full',
        'bg-indigo-100 dark:bg-indigo-900/40',
        'hover:bg-indigo-200 dark:hover:bg-indigo-800/50',
        'border border-indigo-200 dark:border-indigo-700',
        'text-indigo-700 dark:text-indigo-300',
        'text-sm font-medium',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        className
      )}
      aria-label={t("accediAllaSezioneGenitori")}
    >
      <Users className="w-4 h-4" />
      <span className="hidden sm:inline">{t("areaGenitori")}</span>
    </button>
  );
}
