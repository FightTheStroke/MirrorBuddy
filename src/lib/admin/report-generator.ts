/**
 * Admin Report Generator
 * Builds ExtractedContent for PDF generation from admin metrics
 */

import { prisma } from "@/lib/db";
import type {
  ExtractedContent,
  ContentSection,
} from "@/lib/pdf-generator/types";

interface TierCount {
  name: string;
  count: bigint;
}

interface ReportData {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  tierDistribution: { name: string; count: number }[];
  totalSessions: number;
  totalInvites: number;
  pendingInvites: number;
}

async function fetchReportData(): Promise<ReportData> {
  const [userGroups, tierDist, sessionCount, inviteGroups] = await Promise.all([
    prisma.user.groupBy({
      by: ["disabled"],
      _count: { _all: true },
    }),
    prisma.$queryRaw<TierCount[]>`
      SELECT td.name, COUNT(us.id)::bigint as count
      FROM "UserSubscription" us
      JOIN "TierDefinition" td ON us."tierId" = td.id
      GROUP BY td.name
      ORDER BY count DESC
    `,
    prisma.studySession.count(),
    prisma.inviteRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const active =
    userGroups.find((u: { disabled: boolean }) => !u.disabled)?._count._all ??
    0;
  const disabled =
    userGroups.find((u: { disabled: boolean }) => u.disabled)?._count._all ?? 0;
  const pending =
    inviteGroups.find((i: { status: string }) => i.status === "PENDING")?._count
      ._all ?? 0;
  const totalInvites = inviteGroups.reduce(
    (sum: number, i: { _count: { _all: number } }) => sum + i._count._all,
    0,
  );

  return {
    totalUsers: active + disabled,
    activeUsers: active,
    disabledUsers: disabled,
    tierDistribution: tierDist.map((t: TierCount) => ({
      name: t.name,
      count: Number(t.count),
    })),
    totalSessions: sessionCount,
    totalInvites: totalInvites,
    pendingInvites: pending,
  };
}

export async function buildReportContent(): Promise<ExtractedContent> {
  const data = await fetchReportData();
  const now = new Date();
  const dateStr = now.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const sections: ContentSection[] = [
    { type: "heading", content: "Admin Summary Report", level: 1 },
    { type: "paragraph", content: `Report generated: ${dateStr}` },
    { type: "heading", content: "User Statistics", level: 2 },
    {
      type: "list",
      content: "Users",
      items: [
        `Total users: ${data.totalUsers}`,
        `Active: ${data.activeUsers}`,
        `Disabled: ${data.disabledUsers}`,
      ],
    },
    { type: "heading", content: "Tier Distribution", level: 2 },
    {
      type: "list",
      content: "Tiers",
      items: data.tierDistribution.map(
        (t: { name: string; count: number }) => `${t.name}: ${t.count} users`,
      ),
    },
    { type: "heading", content: "Platform Activity", level: 2 },
    {
      type: "list",
      content: "Activity",
      items: [
        `Total sessions: ${data.totalSessions}`,
        `Total invites: ${data.totalInvites}`,
        `Pending invites: ${data.pendingInvites}`,
      ],
    },
  ];

  return {
    title: "MirrorBuddy Admin Report",
    subject: "Admin",
    sections,
    images: [],
    metadata: {
      wordCount: 0,
      readingTime: 0,
      generatedAt: now.toISOString(),
      sourceKitId: "admin-report",
    },
  };
}
