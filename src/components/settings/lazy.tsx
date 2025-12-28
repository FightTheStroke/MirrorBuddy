'use client';

import dynamic from 'next/dynamic';
import { ViewSkeleton } from '@/components/ui/skeleton';

// Lazy load settings view (heavy component with many sub-sections)
export const LazySettingsView = dynamic(
  () => import('./settings-view').then((mod) => ({ default: mod.SettingsView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);
