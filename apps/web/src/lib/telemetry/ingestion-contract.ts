import { z } from 'zod';

const text = z.string().min(1).max(256);
export const telemetryPayloadSchema = z.object({
  events: z
    .array(
      z.object({
        id: text,
        timestamp: z.string().datetime({ offset: true }),
        category: z.enum([
          'navigation',
          'education',
          'conversation',
          'maestro',
          'tools',
          'accessibility',
          'error',
          'performance',
          'ai',
          'voice',
          'realtime',
        ]),
        action: text,
        label: z.string().max(2048).optional(),
        value: z.number().finite().optional(),
        metadata: z
          .record(
            z.string().max(128),
            z.union([z.string().max(2048), z.number().finite(), z.boolean()]),
          )
          .optional(),
        sessionId: text,
      }),
    )
    .max(100),
});

export const activityPayloadSchema = z.object({
  route: z.string().min(1).max(2048).startsWith('/'),
  activityId: z.string().uuid(),
});

const sessionId = z.string().min(1).max(256);
const nonnegative = z.number().finite().nonnegative();
export const sessionMetricSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), sessionId }),
  z.object({ action: z.literal('end'), sessionId }),
  z.object({
    action: z.literal('turn'),
    sessionId,
    turn: z.object({
      latencyMs: nonnegative,
      intent: z.string().max(256).optional(),
      tokensIn: nonnegative.int(),
      tokensOut: nonnegative.int(),
    }),
  }),
  z.object({ action: z.literal('voice'), sessionId, minutes: nonnegative }),
  z.object({ action: z.literal('refusal'), sessionId, wasCorrect: z.boolean() }),
  z.object({
    action: z.literal('incident'),
    sessionId,
    severity: z.enum(['S0', 'S1', 'S2', 'S3']),
  }),
]);
