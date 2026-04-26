'use client';

import dynamic from 'next/dynamic';
import { SessionSkeleton } from '@/components/ui/skeleton';

// Lazy load voice session (heavy component with WebSocket)
export const LazyVoiceSession = dynamic(
  () => import('./voice-session').then((mod) => ({ default: mod.VoiceSession })),
  {
    loading: () => <SessionSkeleton />,
    ssr: false,
  }
);
