/**
 * Database Storage for Escalation Events
 * Persists escalation events to database for audit trail
 */

import { logger } from "@/lib/logger";
import type { EscalationEvent } from "./types";

const log = logger.child({ module: "escalation-db" });

/**
 * Store escalation event in database
 * Server-side only
 */
export async function storeEscalationEvent(
  event: EscalationEvent,
  storeInDb: boolean,
): Promise<void> {
  if (typeof window !== "undefined" || !storeInDb) {
    return;
  }

  try {
    const { prisma } = await import("@/lib/db");
    await prisma.safetyEvent.create({
      data: {
        userId: undefined,
        type: `escalation_${event.trigger}`,
        severity: event.severity === "critical" ? "critical" : "alert",
        conversationId: undefined,
        resolvedBy: undefined,
        resolvedAt: event.resolvedAt || null,
        resolution: event.adminNotes || null,
      },
    });
    log.info("Escalation stored", { eventId: event.id });
  } catch (error) {
    log.error("Store failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
