'use client';

import { useTranslations } from 'next-intl';
import { getAllBuddies } from '@/data/buddy-profiles';

interface BuddiesSectionProps {
  formData: {
    availableBuddies: string[];
  };
  onChange: (data: { availableBuddies: string[] }) => void;
}

export function BuddiesSection({ formData, onChange }: BuddiesSectionProps) {
  const t = useTranslations('admin');
  const buddies = getAllBuddies();

  const handleToggle = (buddyId: string, enabled: boolean) => {
    const updated = enabled
      ? [...formData.availableBuddies, buddyId]
      : formData.availableBuddies.filter((id) => id !== buddyId);
    onChange({ availableBuddies: updated });
  };

  const isEnabled = (buddyId: string): boolean => {
    return formData.availableBuddies.includes(buddyId);
  };

  const selectAll = () => {
    onChange({ availableBuddies: buddies.map((b) => b.id) });
  };

  const selectNone = () => {
    onChange({ availableBuddies: [] });
  };

  const selectedCount = formData.availableBuddies.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('tiers.buddiesAvailable')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('tiers.selectedCount', { selected: selectedCount, total: buddies.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            {t('tiers.selectAll')}
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-xs text-primary hover:underline"
          >
            {t('tiers.deselectAll')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {buddies.map((buddy) => (
          <label
            key={buddy.id}
            htmlFor={`buddy-${buddy.id}`}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              isEnabled(buddy.id)
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="sr-only">{buddy.name}</span>
            <input
              type="checkbox"
              id={`buddy-${buddy.id}`}
              checked={isEnabled(buddy.id)}
              onChange={(e) => handleToggle(buddy.id, e.target.checked)}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary"
            />
            <div aria-hidden="true">
              <div className="text-sm font-medium">{buddy.name}</div>
              <div className="text-xs text-muted-foreground">
                {buddy.personality.slice(0, 50)}...
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
