// ============================================================================
// BULK STUDENT PROVISIONING (T2-05)
// POST /api/admin/sso/sync-directory — Sync students from directory or CSV
// Created for F-06: School Admin Self-Service SSO Configuration
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";
import { hashPII } from "@/lib/security";

interface DirectorySyncRequest {
  schoolId: string;
  provider: "google" | "microsoft";
  students?: StudentRecord[];
}

interface StudentRecord {
  email: string;
  name: string;
  role?: "student" | "teacher" | "admin";
}

function parseCSV(content: string): StudentRecord[] {
  const lines = content.trim().split("\n");
  const records: StudentRecord[] = [];

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) continue;

    const email = parts[0].toLowerCase();
    if (email === "email") continue;

    records.push({
      email,
      name: parts[1],
      role: (parts[2] as "student" | "teacher" | "admin") || "student",
    });
  }

  return records;
}

export const POST = pipe(
  withSentry("/api/admin/sso/sync-directory"),
  withCSRF,
)(async (ctx) => {
  try {
    const contentType = ctx.req.headers.get("content-type") || "";
    let syncRequest: DirectorySyncRequest;

    if (contentType.includes("multipart/form-data")) {
      const formData = await ctx.req.formData();
      const file = formData.get("file") as File | null;
      const schoolId = formData.get("schoolId") as string;
      const provider = formData.get("provider") as "google" | "microsoft";

      if (!file || !schoolId) {
        return NextResponse.json(
          { error: "Missing file or schoolId" },
          { status: 400 },
        );
      }

      const csvContent = await file.text();
      const students = parseCSV(csvContent);

      syncRequest = { schoolId, provider, students };
    } else {
      syncRequest = await ctx.req.json();
    }

    if (!syncRequest.students?.length) {
      return NextResponse.json(
        { error: "No student records provided" },
        { status: 400 },
      );
    }

    let created = 0;
    let skipped = 0;

    for (const student of syncRequest.students) {
      const emailHash = await hashPII(student.email);
      const existing = await prisma.user.findFirst({
        where: { emailHash },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.user.create({
        data: {
          email: student.email,
          username: student.email,
          role: student.role === "admin" ? "ADMIN" : "USER",
          profile: {
            create: {
              name: student.name,
            },
          },
        },
      });
      created++;
    }

    logger.info("[SSO/Sync] Directory sync completed", {
      schoolId: syncRequest.schoolId,
      provider: syncRequest.provider,
      created,
      skipped,
      total: syncRequest.students.length,
    });

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: syncRequest.students.length,
    });
  } catch (error) {
    logger.error("[SSO/Sync] Directory sync failed", undefined, error);
    return NextResponse.json(
      { error: "Directory sync failed" },
      { status: 500 },
    );
  }
});
