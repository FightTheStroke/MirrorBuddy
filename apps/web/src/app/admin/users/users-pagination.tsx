'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { UserListPage } from '@/lib/admin/user-list-types';

export function UsersPagination({
  listing,
  pending,
  onPage,
  onPageSize,
}: {
  listing: UserListPage;
  pending: boolean;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const t = useTranslations('admin');
  const { page, pageSize } = listing.query;
  const start = listing.total === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <nav
      aria-label={t('users.pagination.label')}
      className="flex flex-wrap items-center gap-3 my-4"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t('users.pagination.summary', {
          start,
          end: Math.min(page * pageSize, listing.total),
          total: listing.total,
        })}
      </p>
      <label className="flex items-center gap-2 text-sm">
        {t('users.pagination.pageSize')}
        <select
          value={pageSize}
          disabled={pending}
          onChange={(event) => onPageSize(Number(event.target.value))}
          className="min-h-11 rounded-md border bg-background px-2"
        >
          {[...new Set([25, 50, 100, pageSize])]
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
        </select>
      </label>
      <Button variant="outline" disabled={pending || page <= 1} onClick={() => onPage(page - 1)}>
        {t('previous')}
      </Button>
      <span className="text-sm">
        {t('users.pagination.page', { page, pages: listing.totalPages })}
      </span>
      <Button
        variant="outline"
        disabled={pending || page >= listing.totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t('next')}
      </Button>
    </nav>
  );
}
