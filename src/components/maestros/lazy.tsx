'use client';

import dynamic from 'next/dynamic';
import { SessionSkeleton } from '@/components/ui/skeleton';

// Lazy load maestro session (heavy component with voice + chat)
export const LazyMaestroSession = dynamic(
  () => import('./maestro-session').then((mod) => ({ default: mod.MaestroSession })),
  {
    loading: () => <SessionSkeleton />,
    ssr: false,
  }
);
