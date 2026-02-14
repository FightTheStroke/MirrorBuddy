'use client';

import { useRouter } from 'next/navigation';
import { MaestroSession } from '@/components/maestros/maestro-session';
import type { Maestro, ToolType } from '@/types';

interface MaestroSessionPageProps {
  maestro: Maestro;
  requestedToolType?: ToolType;
  contextMessage?: string;
}

export function MaestroSessionPage({
  maestro,
  requestedToolType,
  contextMessage,
}: MaestroSessionPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <MaestroSession
        maestro={maestro}
        onClose={() => router.back()}
        initialMode="chat"
        requestedToolType={requestedToolType}
        contextMessage={contextMessage}
      />
    </div>
  );
}
