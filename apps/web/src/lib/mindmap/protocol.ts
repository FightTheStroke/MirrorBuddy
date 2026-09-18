import { z } from 'zod';

export class MindmapError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 403 | 404 | 409 | 410,
  ) {
    super(code);
    this.name = 'MindmapError';
  }
}

export type MindmapNode = {
  id: string;
  label: string;
  color?: string;
  icon?: string;
  children: MindmapNode[];
};

const text = z.string().trim().min(1);
export const identitySchema = z.object({
  sessionId: text.max(128),
  toolId: text
    .max(128)
    .refine(
      (value) => !['__proto__', 'constructor', 'prototype'].includes(value),
      'Reserved map identity',
    ),
});
export const nodeSchema: z.ZodType<MindmapNode> = z.lazy(() =>
  z.object({
    id: text,
    label: text,
    color: text.optional(),
    icon: text.optional(),
    children: z.array(nodeSchema),
  }),
);
export const contentSchema = z.object({
  title: text,
  nodes: z.array(nodeSchema),
  markdown: z.string(),
});
export type MindmapContent = z.infer<typeof contentSchema>;
export const snapshotSchema = identitySchema.extend({
  revision: z.number().int().nonnegative(),
  content: contentSchema,
});
export type MindmapSnapshot = z.infer<typeof snapshotSchema>;

const envelope = identitySchema
  .extend({
    operationId: text.max(128),
    baseRevision: z.number().int().nonnegative(),
  })
  .strict();
export const commandSchema = z.discriminatedUnion('command', [
  envelope.extend({
    command: z.literal('mindmap_add_node'),
    args: z.object({ concept: text, parentNode: text.optional() }).strict(),
  }),
  envelope.extend({
    command: z.literal('mindmap_expand_node'),
    args: z.object({ node: text, suggestions: z.array(text).min(1) }).strict(),
  }),
  envelope.extend({
    command: z.literal('mindmap_delete_node'),
    args: z.object({ node: text }).strict(),
  }),
  envelope.extend({
    command: z.literal('mindmap_connect_nodes'),
    args: z.object({ nodeA: text, nodeB: text }).strict(),
  }),
  envelope.extend({
    command: z.literal('mindmap_set_color'),
    args: z.object({ node: text, color: text }).strict(),
  }),
  envelope.extend({
    command: z.literal('mindmap_replace'),
    args: z.object({ content: z.unknown().refine((value) => value != null) }).strict(),
  }),
]);
export type MindmapCommand = z.infer<typeof commandSchema>;
export const outcomeSchema = z.object({
  toolId: text,
  operationId: text,
  revision: z.number().int().nonnegative(),
});
export type MindmapOutcome = z.infer<typeof outcomeSchema>;
export const receiptSchema = outcomeSchema.extend({ fingerprint: text });
export const receiptsSchema = z.array(receiptSchema).max(128);
export type MindmapReceipt = z.infer<typeof receiptSchema>;
