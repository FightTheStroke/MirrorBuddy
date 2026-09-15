'use client';

import type { DynamicOptionsLoadingProps } from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

export function ChartLoading({ error }: DynamicOptionsLoadingProps) {
  if (error) throw error;
  return <Skeleton className="h-full w-full motion-reduce:animate-none" />;
}
