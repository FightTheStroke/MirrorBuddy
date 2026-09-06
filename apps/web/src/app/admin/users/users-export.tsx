'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToCSV, exportToJSON } from '@/lib/admin/export-utils';
import { collectUserExport } from '@/lib/admin/user-list-export';
import type { UserListQuery } from '@/lib/admin/user-list-types';

export function UsersExport({ query, disabled }: { query: UserListQuery; disabled: boolean }) {
  const t = useTranslations('admin.users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const run = async (format: 'csv' | 'json') => {
    setLoading(true);
    setError(false);
    try {
      const rows = await collectUserExport(query);
      const filename = `users-${new Date().toISOString().slice(0, 10)}`;
      if (format === 'json') exportToJSON(rows, filename);
      else
        exportToCSV(
          rows,
          [
            { key: 'username', label: t('table.username') },
            { key: 'email', label: t('table.email') },
            { key: 'role', label: t('table.role') },
            { key: 'disabled', label: t('disabled') },
            { key: 'createdAt', label: t('table.created') },
          ],
          filename,
        );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <div role="group" className="flex gap-1" aria-label={t('pagination.exportFiltered')}>
        {(['csv', 'json'] as const).map((format) => (
          <Button
            key={format}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            onClick={() => void run(format)}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {format.toUpperCase()}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {t('pagination.exportFailed')}
        </p>
      )}
    </div>
  );
}
