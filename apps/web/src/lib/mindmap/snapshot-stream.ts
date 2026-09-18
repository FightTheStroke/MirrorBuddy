import 'server-only';
import type { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api/pipe';
import { logger } from '@/lib/logger';
import { getCorsHeaders } from '@/lib/security';
import { authorizeMindmap, revalidateMindmapAccess } from './http';
import { identitySchema, MindmapError } from './protocol';
import { readMindmap } from './service';

export const MINDMAP_POLL_MS = 2000;

export async function mindmapSnapshotStream(request: NextRequest, allowTrial = true) {
  const identity = identitySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const access = await authorizeMindmap(request, allowTrial);
  const initial = await readMindmap(access.owner, identity);
  let revision = initial.revision;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let abort: (() => void) | undefined;
  const encoder = new TextEncoder();
  const cleanup = () => {
    stopped = true;
    clearTimeout(timer);
    timer = undefined;
    if (abort) request.signal.removeEventListener('abort', abort);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => {
        if (stopped) return;
        cleanup();
        controller.close();
      };
      abort = close;
      request.signal.addEventListener('abort', abort, { once: true });
      if (request.signal.aborted) return close();
      send('mindmap:snapshot', initial);

      const poll = async () => {
        if (stopped) return;
        try {
          await revalidateMindmapAccess(access);
          if (stopped) return;
          const snapshot = await readMindmap(access.owner, identity);
          if (stopped) return;
          if (snapshot.revision > revision) {
            revision = snapshot.revision;
            send('mindmap:snapshot', snapshot);
          } else {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          }
          // Schedule only after the read finishes; never overlap or pin a DB transaction.
          timer = setTimeout(() => {
            void poll();
          }, MINDMAP_POLL_MS);
        } catch (error) {
          if (stopped) return;
          const status =
            error instanceof ApiError
              ? error.statusCode
              : error instanceof MindmapError
                ? error.status
                : 500;
          if (status >= 500) logger.error('Mindmap snapshot polling failed', { status }, error);
          send('mindmap:error', {
            status,
            error: status >= 500 ? 'Snapshot unavailable' : 'Map access ended',
          });
          close();
        }
      };
      timer = setTimeout(() => {
        void poll();
      }, MINDMAP_POLL_MS);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
      ...getCorsHeaders(request.headers.get('origin')),
    },
  });
}
