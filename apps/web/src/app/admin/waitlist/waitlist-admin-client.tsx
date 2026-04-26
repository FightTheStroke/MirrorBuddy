'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/logger/client';

interface WaitlistStats {
  total: number;
  pending: number;
  invited: number;
  todaySignups: number;
}

interface WaitlistEntry {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  invitedAt: string | null;
  position: number | null;
}

interface WaitlistListResponse {
  entries: WaitlistEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  invited: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  registered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export function WaitlistAdminClient() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/waitlist/stats');
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      clientLogger.error(
        'Failed to fetch waitlist stats',
        { component: 'WaitlistAdminClient' },
        err,
      );
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/waitlist?${params.toString()}`);
      if (!res.ok) throw new Error(`Entries fetch failed: ${res.status}`);
      const data: WaitlistListResponse = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      clientLogger.error(
        'Failed to fetch waitlist entries',
        { component: 'WaitlistAdminClient' },
        err,
      );
      setError(err instanceof Error ? err.message : t('waitlist.errorLoading'));
    }
  }, [page, search, statusFilter, t]);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        await Promise.all([fetchStats(), fetchEntries()]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchStats, fetchEntries],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === statusFilter ? '' : value);
    setPage(1);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('waitlist.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={Users}
        title={t('waitlist.title')}
        rightContent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAll(true)}
            disabled={refreshing}
            aria-label={t('waitlist.refresh')}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')}
              aria-hidden="true"
            />
            {t('waitlist.refresh')}
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('waitlist.totalSignups')}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('waitlist.pending')}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pending.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('waitlist.invited')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.invited.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('waitlist.todaySignups')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.todaySignups.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder={t('waitlist.searchPlaceholder')}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
                aria-label={t('waitlist.searchPlaceholder')}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['pending', 'invited', 'registered'].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                >
                  {t(`waitlist.status.${s}`)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('waitlist.entriesTitle')} ({total.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label={t('waitlist.tableAriaLabel')}>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t('waitlist.columnEmail')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('waitlist.columnStatus')}</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    {t('waitlist.columnPosition')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    {t('waitlist.columnSignedUp')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    {t('waitlist.columnInvited')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      {t('waitlist.noEntries')}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs break-all">{entry.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-xs', STATUS_COLORS[entry.status] ?? '')}>
                          {t(`waitlist.status.${entry.status}`, { default: entry.status })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {entry.position != null ? `#${entry.position}` : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {entry.invitedAt ? formatDate(entry.invitedAt) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {t('waitlist.pageInfo', { current: page, total: Math.ceil(total / pageSize) })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label={t('waitlist.previousPage')}
                >
                  {t('waitlist.previousPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  aria-label={t('waitlist.nextPage')}
                >
                  {t('waitlist.nextPage')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
