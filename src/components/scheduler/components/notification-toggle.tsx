'use client';

import { ReactNode } from 'react';

interface NotificationToggleProps {
  icon: ReactNode;
  label: string;
  description: string;
  isEnabled: boolean;
  isDisabled?: boolean;
  onChange: (value: boolean) => void;
}

export function NotificationToggle({
  icon,
  label,
  description,
  isEnabled,
  isDisabled,
  onChange,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={() => onChange(!isEnabled)}
        disabled={isDisabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
