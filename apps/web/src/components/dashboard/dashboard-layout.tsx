/**
 * Dashboard Layout Component
 * Responsive grid layout for dashboard widgets
 * Mobile: 1 col | Tablet: 2 col | Desktop: 3-4 col
 */

'use client';

import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div
      className={cn(
        'grid gap-4 w-full',
        'grid-cols-1',
        'md:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}

interface DashboardRowProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardRow({ children, className }: DashboardRowProps) {
  return (
    <div className={cn('col-span-full grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4 | 'full';
}

export function DashboardCard({ children, className, span = 1 }: DashboardCardProps) {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4',
    full: 'col-span-full',
  };

  return (
    <div className={cn(spanClasses[span], className)}>
      {children}
    </div>
  );
}
