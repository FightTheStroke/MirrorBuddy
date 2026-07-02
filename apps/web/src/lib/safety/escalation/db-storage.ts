/**
 * Database Storage for Escalation Events
 * Persists escalation events to the SafetyEvent table for audit trail.
 *
 * D-07: On serverless (Vercel) the in-memory escalation buffer resets per
 * instance/cold start, so this table is the durable source of truth for the
 * EU-AI-Act human oversight console (/api/admin/safety). Reads must use
 * getRecentEscalationsFromDb / getUnresolvedEscalationsFromDb — never the
 * buffer.
 *
 * All data stored here is anonymized upstream (hashed session, no PII).
 */

import { logger } from "@/lib/logger";
import type {
  EscalationEvent,
  EscalationSeverity,
  EscalationTrigger,
} from "./types";

const log = logger.child({ module: "escalation-db" });

/** SafetyEvent.type prefix for escalation rows */
const ESCALATION_TYPE_PREFIX = "escalation_";

/**
 * Memoized lazy import of the DB module (server-only).
 * A single shared promise avoids concurrent dynamic imports when the
 * dashboard fires multiple queries in parallel (Promise.all).
 */
type DbModule = typeof import("@/lib/db");
let dbModulePromise: Promise<DbModule> | undefined;
function loadDb(): Promise<DbModule> {
  dbModulePromise ??= import("@/lib/db").catch((error: unknown) => {
    dbModulePromise = undefined; // do not cache a failed import
    throw error;
  });
  return dbModulePromise;
}

/** Hard caps on rows fetched for dashboard queries */
const MAX_RECENT_ROWS = 200;
const MAX_UNRESOLVED_ROWS = 500;

/** Minimal SafetyEvent row shape used for escalation mapping */
interface SafetyEventRow {
  id: string;
  type: string;
  severity: string;
  timestamp: Date;
  sessionId: string | null;
  resolvedAt: Date | null;
  resolution: string | null;
  metadata: unknown;
}

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
    const { prisma } = await loadDb();
    await prisma.safetyEvent.create({
      data: {
        userId: undefined,
        type: `${ESCALATION_TYPE_PREFIX}${event.trigger}`,
        severity: event.severity === "critical" ? "critical" : "alert",
        conversationId: undefined,
        sessionId: event.sessionHash || null,
        timestamp: event.timestamp,
        resolvedBy: undefined,
        resolvedAt: event.resolvedAt || null,
        resolution: event.adminNotes || null,
        // Anonymized context needed to rebuild the event on read (D-07).
        metadata: {
          escalationId: event.id,
          severity: event.severity,
          maestroId: event.maestroId ?? null,
          adminNotified: event.adminNotified,
          reason: event.metadata?.reason ?? null,
        },
      },
    });
    log.info("Escalation stored", { eventId: event.id });
  } catch (error) {
    log.error("Store failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read recent escalation events from the database (durable source of truth).
 * Returns [] on error — the oversight dashboard must degrade gracefully.
 */
export async function getRecentEscalationsFromDb(
  limitMinutes = 60,
): Promise<EscalationEvent[]> {
  if (typeof window !== "undefined") {
    return [];
  }

  try {
    const { prisma } = await loadDb();
    const cutoff = new Date(Date.now() - limitMinutes * 60000);
    const rows = await prisma.safetyEvent.findMany({
      where: {
        type: { startsWith: ESCALATION_TYPE_PREFIX },
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: "desc" },
      take: MAX_RECENT_ROWS,
    });
    return rows.map((row: SafetyEventRow) => rowToEscalationEvent(row));
  } catch (error) {
    log.error("Recent escalations read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Read unresolved escalation events from the database.
 * Returns [] on error.
 */
export async function getUnresolvedEscalationsFromDb(): Promise<
  EscalationEvent[]
> {
  if (typeof window !== "undefined") {
    return [];
  }

  try {
    const { prisma } = await loadDb();
    const rows = await prisma.safetyEvent.findMany({
      where: {
        type: { startsWith: ESCALATION_TYPE_PREFIX },
        resolvedAt: null,
      },
      orderBy: { timestamp: "desc" },
      take: MAX_UNRESOLVED_ROWS,
    });
    return rows.map((row: SafetyEventRow) => rowToEscalationEvent(row));
  } catch (error) {
    log.error("Unresolved escalations read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Persist an escalation resolution so it survives instance recycling.
 * Matches by DB row id OR by the original escalation event id stored in
 * metadata (rows created before this fix have no metadata and can only be
 * matched by row id).
 */
export async function resolveEscalationInDb(
  eventId: string,
  adminNotes?: string,
): Promise<void> {
  if (typeof window !== "undefined") {
    return;
  }

  try {
    const { prisma } = await loadDb();
    await prisma.safetyEvent.updateMany({
      where: {
        type: { startsWith: ESCALATION_TYPE_PREFIX },
        OR: [
          { id: eventId },
          { metadata: { path: ["escalationId"], equals: eventId } },
        ],
      },
      data: {
        resolvedAt: new Date(),
        resolution: adminNotes ?? null,
      },
    });
    log.info("Escalation resolution persisted", { eventId });
  } catch (error) {
    log.error("Resolution persist failed", {
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Rebuild an EscalationEvent from a SafetyEvent row.
 * Rows written before the D-07 fix lack metadata; fall back to safe defaults.
 */
function rowToEscalationEvent(row: SafetyEventRow): EscalationEvent {
  const meta = asRecord(row.metadata) ?? {};
  const trigger = row.type.startsWith(ESCALATION_TYPE_PREFIX)
    ? (row.type.slice(ESCALATION_TYPE_PREFIX.length) as EscalationTrigger)
    : (row.type as EscalationTrigger);

  const severity: EscalationSeverity =
    meta.severity === "critical" || meta.severity === "high"
      ? meta.severity
      : row.severity === "critical"
        ? "critical"
        : "high";

  return {
    id: typeof meta.escalationId === "string" ? meta.escalationId : row.id,
    trigger,
    severity,
    timestamp: row.timestamp,
    sessionHash: row.sessionId ?? undefined,
    maestroId: typeof meta.maestroId === "string" ? meta.maestroId : undefined,
    metadata: typeof meta.reason === "string" ? { reason: meta.reason } : {},
    adminNotified: meta.adminNotified === true,
    adminNotes: row.resolution ?? undefined,
    resolved: row.resolvedAt != null,
    resolvedAt: row.resolvedAt ?? undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
