'use client';

import { useTranslations } from 'next-intl';
import { Mail, ShieldAlert, Bug, ServerCrash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionRequiredProps {
  pendingInvites: number;
  safetyUnresolved: number;
  sentryErrors: number;
  servicesDown: number;
}

const ITEMS = [
  { key: 'pendingInvites', icon: Mail, prop: 'pendingInvites' as const, href: '/admin/invites' },
  {
    key: 'safetyEvents',
    icon: ShieldAlert,
    prop: 'safetyUnresolved' as const,
    href: '/admin/safety',
  },
  {
    key: 'sentryErrors',
    icon: Bug,
    prop: 'sentryErrors' as const,
    href: 'https://sentry.io',
    external: true,
  },
  {
    key: 'servicesDown',
    icon: ServerCrash,
    prop: 'servicesDown' as const,
    href: '/admin/mission-control/health',
  },
] as const;

export function ActionRequiredSection(props: ActionRequiredProps) {
  const { safetyUnresolved, servicesDown } = props;
  const t = useTranslations('admin.dashboard');

  const activeItems = ITEMS.filter((item) => props[item.prop] > 0);
  if (activeItems.length === 0) return null;

  const hasCritical = servicesDown > 0 || safetyUnresolved > 0;
  const borderColor = hasCritical
    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950'
    : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950';
  const textColor = hasCritical
    ? 'text-red-800 dark:text-red-200'
    : 'text-amber-800 dark:text-amber-200';

  return (
    <div className={cn('rounded-xl border p-4', borderColor)} role="alert">
      <h3 className={cn('text-sm font-semibold mb-3', textColor)}>{t('actionRequired.title')}</h3>
      <div className="flex flex-wrap gap-2">
        {activeItems.map((item) => {
          const Icon = item.icon;
          const count = props[item.prop];
          const label = t(`actionRequired.${item.key}`);
          return (
            <a
              key={item.key}
              href={item.href}
              {...('external' in item ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:shadow-sm transition-shadow"
              aria-label={`${label}: ${count}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-xs font-bold">
                {count}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
