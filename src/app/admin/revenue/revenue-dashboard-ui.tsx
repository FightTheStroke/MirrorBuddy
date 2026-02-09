'use client';

import { useTranslations } from 'next-intl';

interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  proSubscriptions: number;
  baseSubscriptions: number;
  trialUsers: number;
  churnRate: number;
  avgLTV: number;
  revenueByCountry: { country: string; revenue: number }[];
  monthlyTrend: { month: string; mrr: number; subscribers: number }[];
  recentActivity: {
    type: 'upgrade' | 'downgrade' | 'new' | 'churn';
    userId: string;
    date: Date;
    from?: string;
    to?: string;
  }[];
}

interface RevenueDashboardUIProps {
  metrics: RevenueMetrics;
}

export function RevenueDashboardUI({ metrics }: RevenueDashboardUIProps) {
  const t = useTranslations('admin.revenue');
  return (
    <div className="max-w-7xl mx-auto">
      {/* Key Metrics */}
      <div className="mb-8 grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('mrr')}</div>
          <div className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            €{metrics.mrr.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('arr')}</div>
          <div className="mt-2 text-3xl font-bold dark:text-gray-100">
            €{metrics.arr.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('activeSubs')}
          </div>
          <div className="mt-2 text-3xl font-bold dark:text-gray-100">
            {metrics.activeSubscriptions}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('proBase', { pro: metrics.proSubscriptions, base: metrics.baseSubscriptions })}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('trialUsers')}
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {metrics.trialUsers}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('churnRate')}
          </div>
          <div
            className={`mt-2 text-3xl font-bold ${metrics.churnRate > 5 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
          >
            {metrics.churnRate}%
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('last30Days')}</div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('avgLtv')}</div>
          <div className="mt-2 text-3xl font-bold dark:text-gray-100">
            €{metrics.avgLTV.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <h2 className="mb-4 text-lg font-medium dark:text-gray-100">{t('mrrTrend6Months')}</h2>
          <div className="space-y-2">
            {metrics.monthlyTrend.map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">{month.month}</span>
                <div className="flex items-center gap-4">
                  <div
                    className="h-4 bg-indigo-500 rounded"
                    style={{
                      width: `${Math.max(20, (month.mrr / Math.max(...metrics.monthlyTrend.map((m) => m.mrr || 1))) * 150)}px`,
                    }}
                  />
                  <span className="w-20 text-right text-sm font-medium dark:text-gray-200">
                    €{month.mrr.toFixed(0)}
                  </span>
                  <span className="w-16 text-right text-xs text-gray-500 dark:text-gray-400">
                    {month.subscribers} {t('subs')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Country */}
        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <h2 className="mb-4 text-lg font-medium dark:text-gray-100">{t('revenueByCountry')}</h2>
          <div className="space-y-3">
            {metrics.revenueByCountry.map((item) => (
              <div key={item.country} className="flex items-center justify-between">
                <span className="text-sm font-medium dark:text-gray-200">
                  {item.country === 'IT' && '🇮🇹 '}
                  {item.country === 'FR' && '🇫🇷 '}
                  {item.country === 'DE' && '🇩🇪 '}
                  {item.country === 'ES' && '🇪🇸 '}
                  {item.country}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 bg-green-500 rounded"
                    style={{
                      width: `${Math.max(10, (item.revenue / metrics.mrr) * 100)}px`,
                    }}
                  />
                  <span className="text-sm dark:text-gray-200">€{item.revenue.toFixed(2)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({((item.revenue / metrics.mrr) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow lg:col-span-2">
          <h2 className="mb-4 text-lg font-medium dark:text-gray-100">{t('recentActivity')}</h2>
          {metrics.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {metrics.recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-700 px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        activity.type === 'upgrade'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                          : activity.type === 'new'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                            : activity.type === 'churn'
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
                      }`}
                    >
                      {activity.type}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t('userPrefix')} {activity.userId.slice(0, 8)}...
                    </span>
                    {activity.from && activity.to && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.from} → {activity.to}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.date.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('noRecentActivity')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
