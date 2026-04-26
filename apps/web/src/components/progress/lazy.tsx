'use client';

import dynamic from 'next/dynamic';
import { ViewSkeleton } from '@/components/ui/skeleton';

// Lazy load progress view (heavy component with charts)
export const LazyProgressView = dynamic(
  () => import('./progress-view').then((mod) => ({ default: mod.ProgressView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);
