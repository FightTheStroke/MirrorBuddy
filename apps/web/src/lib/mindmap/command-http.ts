import 'server-only';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeMindmap } from './http';
import { identitySchema, MindmapError } from './protocol';
import { modifyMindmap, readMindmap } from './service';
import { resolveMindmapFocus } from './tree';

const focusSchema = identitySchema.extend({
  command: z.literal('mindmap_focus_node'),
  operationId: z.string().trim().min(1).max(128),
  baseRevision: z.number().int().nonnegative(),
  args: z.object({ node: z.string().trim().min(1) }).strict(),
});

export async function mindmapCommand(request: NextRequest, body: Record<string, unknown>) {
  const access = await authorizeMindmap(request);
  if (body.command === 'mindmap_focus_node') {
    const focus = focusSchema.parse(body);
    const snapshot = await readMindmap(access.owner, focus);
    if (snapshot.revision !== focus.baseRevision) throw new MindmapError('REVISION_CONFLICT', 409);
    return Response.json({
      toolId: snapshot.toolId,
      revision: snapshot.revision,
      operationId: focus.operationId,
      focus: resolveMindmapFocus(snapshot.content, focus.args.node),
    });
  }
  const { toolType: _toolType, ...command } = body;
  return Response.json(await modifyMindmap(access.owner, command));
}
