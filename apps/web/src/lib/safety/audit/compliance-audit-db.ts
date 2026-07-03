/**
 * Durable Storage for Compliance Audit Entries (server-only)
 * Part of Ethical Design Hardening (F-07 - L.132 Art.4) / D-07 remediation.
 *
 * On serverless (Vercel) the in-memory compliance buffer resets per
 * instance/cold start, so the ComplianceAuditEntry table is the source of
 * truth for the EU-AI-Act human oversight console (/api/admin/safety).
 *
 * Writes: persistComplianceEntry() — called per event by the compliance
 * audit service (fire-and-forget with error handling).
 * Reads: getComplianceEntriesFromDb() / getComplianceStatisticsFromDb().
 *
 * All queries are parameterized Prisma queries. No PII is stored or logged:
 * entries are anonymized upstream (session hashes, redacted details).
 */

import { logger } from "@/lib/logger";
import type {
  ComplianceAuditEntry,
  ComplianceAuditStats,
  ComplianceEventType,
  ComplianceOutcome,
  ComplianceUserContext,
  MitigationAction,
  RegulatoryContext,
} from "./compliance-audit-types";
import {
  COMPLIANCE_EVENT_TYPES,
  DEFAULT_COMPLIANCE_CONFIG,
} from "./compliance-audit-types";
import {
  buildRegulatoryContext,
  computeComplianceStatistics,
} from "./compliance-audit-stats";

const log = logger.child({ module: "compliance-audit-db" });

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

/** Hard cap on rows fetched for list queries */
const MAX_LIST_ROWS = 500;
/** Hard cap on rows fetched for statistics computation */
const MAX_STATS_ROWS = 5000;

const VALID_SEVERITIES: ReadonlyArray<ComplianceAuditEntry["severity"]> = [
  "critical",
  "high",
  "medium",
  "low",
];

const VALID_OUTCOMES: ReadonlyArray<ComplianceOutcome> = [
  "blocked",
  "modified",
  "escalated",
  "allowed",
  "monitored",
];

const VALID_MITIGATIONS: ReadonlyArray<MitigationAction> = [
  "content_blocked",
  "content_modified",
  "user_warned",
  "escalated_to_human",
  "session_paused",
  "account_restricted",
  "none",
];

const VALID_AGE_GROUPS: ReadonlyArray<ComplianceUserContext["ageGroup"]> = [
  "child",
  "teen",
  "adult",
  "unknown",
];

/** Minimal row shape read back from the ComplianceAuditEntry table */
interface ComplianceAuditRow {
  id: string;
  eventType: string;
  severity: string;
  details: string | null;
  createdAt: Date;
}

/**
 * Persist a compliance audit entry to the database.
 * Server-side only; errors are logged (no PII) and never thrown.
 */
export async function persistComplianceEntry(
  entry: ComplianceAuditEntry,
): Promise<void> {
  if (typeof window !== "undefined") {
    return;
  }

  try {
    const { prisma } = await loadDb();
    await prisma.complianceAuditEntry.create({
      data: {
        eventType: entry.eventType,
        severity: entry.severity,
        description: `Compliance event: ${entry.eventType}`,
        details: JSON.stringify({
          source: "compliance-audit-service",
          auditId: entry.id,
          regulatoryContext: entry.regulatoryContext,
          userContext: entry.userContext,
          eventDetails: entry.eventDetails,
          mitigationApplied: entry.mitigationApplied,
          outcome: entry.outcome,
          maestroId: entry.maestroId,
          contentHash: entry.contentHash,
          confidenceScore: entry.confidenceScore,
          auditNotes: entry.auditNotes,
          incidentReference: entry.incidentReference,
        }),
        userId: null,
        adminId: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(entry.timestamp),
      },
    });
    log.debug("Compliance entry persisted", { auditId: entry.id });
  } catch (error) {
    log.error("Compliance entry persistence failed", {
      auditId: entry.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read compliance audit entries from the database (durable source of truth).
 * Mirrors the in-memory getComplianceEntries() filter options.
 * Returns [] on error — the oversight dashboard must degrade gracefully.
 */
export async function getComplianceEntriesFromDb(options: {
  eventType?: ComplianceEventType;
  severity?: ComplianceAuditEntry["severity"];
  outcome?: ComplianceOutcome;
  startDate?: string;
  endDate?: string;
  limit?: number;
  ageGroup?: ComplianceUserContext["ageGroup"];
}): Promise<ComplianceAuditEntry[]> {
  if (typeof window !== "undefined") {
    return [];
  }

  try {
    const { prisma } = await loadDb();

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (options.startDate) createdAt.gte = new Date(options.startDate);
    if (options.endDate) createdAt.lte = new Date(options.endDate);

    // In-memory filters (outcome/ageGroup live inside the details JSON),
    // so only apply the SQL-side limit when they are absent.
    const hasPostFilters = Boolean(options.outcome || options.ageGroup);
    const cap = Math.min(options.limit ?? MAX_LIST_ROWS, MAX_LIST_ROWS);

    const rows = await prisma.complianceAuditEntry.findMany({
      where: {
        eventType: options.eventType ?? { in: [...COMPLIANCE_EVENT_TYPES] },
        ...(options.severity ? { severity: options.severity } : {}),
        ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: hasPostFilters ? MAX_LIST_ROWS : cap,
      select: {
        id: true,
        eventType: true,
        severity: true,
        details: true,
        createdAt: true,
      },
    });

    let entries = rows.map((row: ComplianceAuditRow) => rowToComplianceEntry(row));

    if (options.outcome) {
      entries = entries.filter((e) => e.outcome === options.outcome);
    }
    if (options.ageGroup) {
      entries = entries.filter(
        (e) => e.userContext.ageGroup === options.ageGroup,
      );
    }
    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  } catch (error) {
    log.error("Compliance entries read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Compute compliance audit statistics from the database (durable source).
 * Returns empty statistics on error — never undefined.
 */
export async function getComplianceStatisticsFromDb(
  periodDays: number = 30,
): Promise<ComplianceAuditStats> {
  const now = new Date();
  const periodStart = new Date(
    now.getTime() - periodDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const periodEnd = now.toISOString();

  if (typeof window !== "undefined") {
    return computeComplianceStatistics([], periodStart, periodEnd);
  }

  try {
    const { prisma } = await loadDb();
    const rows = await prisma.complianceAuditEntry.findMany({
      where: {
        eventType: { in: [...COMPLIANCE_EVENT_TYPES] },
        createdAt: { gte: new Date(periodStart) },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_STATS_ROWS,
      select: {
        id: true,
        eventType: true,
        severity: true,
        details: true,
        createdAt: true,
      },
    });

    const entries = rows.map((row: ComplianceAuditRow) => rowToComplianceEntry(row));
    return computeComplianceStatistics(entries, periodStart, periodEnd);
  } catch (error) {
    log.error("Compliance statistics read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return computeComplianceStatistics([], periodStart, periodEnd);
  }
}

/**
 * Map a DB row back to a ComplianceAuditEntry.
 * Rows written by the compliance audit service round-trip via the details
 * JSON; rows written by other services (e.g. audit-trail-service) fall back
 * to safe defaults derived from the event type.
 */
function rowToComplianceEntry(row: ComplianceAuditRow): ComplianceAuditEntry {
  const parsed = parseDetails(row.details);
  const eventType = isComplianceEventType(row.eventType)
    ? row.eventType
    : "user_reported_issue";
  const severity = VALID_SEVERITIES.includes(
    row.severity as ComplianceAuditEntry["severity"],
  )
    ? (row.severity as ComplianceAuditEntry["severity"])
    : "low";

  const rawUserContext = asRecord(parsed.userContext);
  const ageGroup = VALID_AGE_GROUPS.includes(
    rawUserContext?.ageGroup as ComplianceUserContext["ageGroup"],
  )
    ? (rawUserContext?.ageGroup as ComplianceUserContext["ageGroup"])
    : "unknown";
  const sessionHash =
    typeof rawUserContext?.sessionHash === "string"
      ? rawUserContext.sessionHash
      : typeof parsed.sessionHash === "string"
        ? parsed.sessionHash
        : "unknown";

  const rawRegulatory = asRecord(parsed.regulatoryContext);
  const regulatoryContext: RegulatoryContext = rawRegulatory
    ? {
        aiAct: rawRegulatory.aiAct === true,
        gdpr: rawRegulatory.gdpr === true,
        coppa: rawRegulatory.coppa === true,
        italianL132Art4: rawRegulatory.italianL132Art4 === true,
      }
    : buildRegulatoryContext(eventType);

  return {
    id: typeof parsed.auditId === "string" ? parsed.auditId : row.id,
    timestamp: row.createdAt.toISOString(),
    eventType,
    severity,
    regulatoryContext,
    userContext: {
      sessionHash,
      ageGroup,
      region: DEFAULT_COMPLIANCE_CONFIG.defaultRegion,
    },
    eventDetails:
      asRecord(parsed.eventDetails) ?? asRecord(parsed.metadata) ?? {},
    mitigationApplied: VALID_MITIGATIONS.includes(
      parsed.mitigationApplied as MitigationAction,
    )
      ? (parsed.mitigationApplied as MitigationAction)
      : "none",
    outcome: VALID_OUTCOMES.includes(parsed.outcome as ComplianceOutcome)
      ? (parsed.outcome as ComplianceOutcome)
      : "monitored",
    maestroId:
      typeof parsed.maestroId === "string" ? parsed.maestroId : undefined,
    contentHash:
      typeof parsed.contentHash === "string" ? parsed.contentHash : undefined,
    confidenceScore:
      typeof parsed.confidenceScore === "number"
        ? parsed.confidenceScore
        : undefined,
    auditNotes:
      typeof parsed.auditNotes === "string" ? parsed.auditNotes : undefined,
    incidentReference:
      typeof parsed.incidentReference === "string"
        ? parsed.incidentReference
        : undefined,
  };
}

function isComplianceEventType(value: string): value is ComplianceEventType {
  return (COMPLIANCE_EVENT_TYPES as readonly string[]).includes(value);
}

function parseDetails(details: string | null): Record<string, unknown> {
  if (!details) return {};
  try {
    const parsed: unknown = JSON.parse(details);
    return asRecord(parsed) ?? {};
  } catch {
    return {};
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
