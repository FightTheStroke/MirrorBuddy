/**
 * School registration API endpoint
 * Creates a ContactRequest for school pilot onboarding
 * Sends admin invite email via Resend
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { recordAuditEvent } from "@/lib/audit/admin-audit";


export const revalidate = 0;
const log = logger.child({ module: "school-register" });

const handler = pipe(
  withSentry("/api/schools/register"),
  withCSRF,
)(async (ctx) => {
  try {
    const body = await ctx.req.json();
    const { schoolName, contactName, email, vatNumber, tier, studentCount } =
      body;

    if (!schoolName || !contactName || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const contactRequest = await prisma.contactRequest.create({
      data: {
        type: "schools",
        name: contactName,
        email,
        data: {
          schoolName,
          vatNumber: vatNumber || null,
          tier: tier || "base",
          studentCount: studentCount ? Number(studentCount) : null,
        },
        status: "pending",
      },
    });

    await recordAuditEvent({
      action: "data.export",
      actorId: email,
      targetId: contactRequest.id,
      targetType: "ContactRequest",
      metadata: { schoolName, tier },
    });

    try {
      await sendEmail({
        to: email,
        subject: "MirrorBuddy School Registration Received",
        html: `<h1>Welcome, ${contactName}!</h1><p>We received your school registration for <strong>${schoolName}</strong>. Our team will contact you within 24 hours to set up your pilot program.</p>`,
        text: `Welcome, ${contactName}! We received your school registration for ${schoolName}. Our team will contact you within 24 hours.`,
      });
    } catch (emailError) {
      log.warn("Failed to send school registration email", {
        email,
        error: String(emailError),
      });
    }

    return NextResponse.json({
      success: true,
      id: contactRequest.id,
    });
  } catch (error) {
    log.error("School registration failed", { error: String(error) });
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
});

export const POST = handler;
