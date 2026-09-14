'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface UsersSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function UsersSearch({ value, onChange, onSubmit, disabled }: UsersSearchProps) {
  const t = useTranslations('admin');
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <input
          type="search"
          placeholder={t('cercaPerEmailOUsername')}
          aria-label={t('cercaPerEmailOUsername')}
          value={value}
          maxLength={200}
          onChange={(event) => onChange(event.target.value)}
          className="w-full pl-10 pr-10 py-3 border border-border rounded-lg min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder-slate-400"
        />
        {value && (
          <button
            type="button"
            disabled={disabled}
            aria-label={t('users.pagination.clearSearch')}
            onClick={() => {
              onChange('');
              onSubmit('');
            }}
            className="absolute right-0 top-0 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>
      <button type="submit" disabled={disabled} className="min-h-11 rounded-md border px-3">
        {t('users.pagination.search')}
      </button>
    </form>
  );
}
