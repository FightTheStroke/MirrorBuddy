'use client';

import dynamic from 'next/dynamic';
import { SessionSkeleton } from '@/components/ui/skeleton';

// Lazy load chat session (heavy component with streaming)
export const LazyChatSession = dynamic(
  () => import('./chat-session').then((mod) => ({ default: mod.ChatSession })),
  {
    loading: () => <SessionSkeleton />,
    ssr: false,
  }
);
