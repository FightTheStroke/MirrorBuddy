/**
 * @file toggle.tsx
 * @brief Toggle component for accessibility settings
 */

import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  icon,
}: ToggleProps) {
  const { settings } = useAccessibilityStore();

  return (
    <label
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors',
        settings.highContrast
          ? 'bg-gray-900 hover:bg-gray-800 border border-gray-700'
          : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
      )}
    >
      {icon && (
        <span
          className={
            settings.highContrast ? 'text-yellow-400' : 'text-blue-500'
          }
        >
          {icon}
        </span>
      )}

      <div className="flex-1">
        <span
          className={cn(
            'block font-medium',
            settings.highContrast
              ? 'text-white'
              : 'text-slate-900 dark:text-white',
            settings.dyslexiaFont && 'tracking-wide'
          )}
          style={{ fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px` }}
        >
          {label}
        </span>
        <span
          className={cn(
            'block text-sm',
            settings.highContrast
              ? 'text-gray-400'
              : 'text-slate-500 dark:text-slate-400',
            settings.dyslexiaFont && 'tracking-wide'
          )}
        >
          {description}
        </span>
      </div>

      <div
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors',
          checked
            ? settings.highContrast
              ? 'bg-yellow-400'
              : 'bg-accent-themed'
            : settings.highContrast
              ? 'bg-gray-700'
              : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            'absolute top-1 left-1 w-5 h-5 rounded-full transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
            settings.highContrast ? 'bg-black' : 'bg-white'
          )}
        />
      </div>
    </label>
  );
}

