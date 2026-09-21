import 'server-only';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { broadcastToolEvent } from '@/lib/realtime/tool-events';
import { authorizeMindmap } from './http';
import { identitySchema } from './protocol';
import { initializeMindmap } from './service';

const createSchema = identitySchema.extend({
  toolType: z.literal('mindmap'),
  maestroId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subject: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
});

export async function createMindmapFromVoice(request: NextRequest, input: unknown) {
  const access = await authorizeMindmap(request);
  const body = createSchema.parse(input);
  const snapshot = await initializeMindmap(access.owner, {
    toolId: body.toolId,
    sessionId: body.sessionId,
    content: { ...body.content, title: body.title },
  });
  // Completion is published only after the authoritative state has been committed.
  broadcastToolEvent({
    id: snapshot.toolId,
    type: 'tool:created',
    toolType: 'mindmap',
    sessionId: snapshot.sessionId,
    maestroId: body.maestroId,
    timestamp: Date.now(),
    data: { title: snapshot.content.title, subject: body.subject },
  });
  broadcastToolEvent({
    id: snapshot.toolId,
    type: 'tool:complete',
    toolType: 'mindmap',
    sessionId: snapshot.sessionId,
    maestroId: body.maestroId,
    timestamp: Date.now(),
    data: { content: snapshot.content, title: snapshot.content.title, revision: snapshot.revision },
  });
  return Response.json({
    success: true,
    toolId: snapshot.toolId,
    sessionId: snapshot.sessionId,
    toolType: 'mindmap',
    status: 'completed',
    revision: snapshot.revision,
  });
}
