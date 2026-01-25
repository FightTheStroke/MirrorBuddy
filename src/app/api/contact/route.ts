import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFormData, sendAdminNotification } from "./helpers";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "contact-api" });

interface ContactRequest {
  name: string;
  email: string;
  type: "general" | "schools" | "enterprise";
  subject?: string;
  message?: string;
  role?: string;
  // Schools fields
  schoolName?: string;
  schoolType?: string;
  studentCount?: string;
  specificNeeds?: string;
  // Enterprise fields
  company?: string;
  sector?: string;
  employeeCount?: string;
  topics?: string[];
  [key: string]: string | string[] | undefined;
}

interface ContactResponse {
  success: boolean;
  message: string;
  id?: string;
  emailSent?: boolean;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ContactResponse>> {
  try {
    const body = (await request.json()) as ContactRequest;

    // Validate required fields
    if (!body.name || !body.email || !body.type) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate email format - using simple non-backtracking regex to avoid ReDoS
    // Matches: local@domain.tld (basic validation, server-side)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(body.email) || body.email.length > 254) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 },
      );
    }

    // Type-specific validation
    if (body.type === "schools") {
      if (
        !body.role ||
        !body.schoolName ||
        !body.schoolType ||
        !body.studentCount
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing required fields for schools contact",
          },
          { status: 400 },
        );
      }
    } else if (body.type === "enterprise") {
      if (
        !body.role ||
        !body.company ||
        !body.sector ||
        !body.employeeCount ||
        !body.topics ||
        body.topics.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing required fields for enterprise contact",
          },
          { status: 400 },
        );
      }
    } else if (body.type === "general") {
      if (!body.subject || !body.message) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }
    }

    // Save to database
    let contactRequest;
    try {
      const formData = extractFormData(body);
      contactRequest = await prisma.contactRequest.create({
        data: {
          type: body.type,
          name: body.name,
          email: body.email,
          data: formData,
          status: "pending",
        },
      });

      log.info("Contact request saved", {
        id: contactRequest.id,
        type: body.type,
      });
    } catch (dbError) {
      log.error("Database error saving contact request", { error: dbError });
      return NextResponse.json(
        { success: false, message: "Failed to save contact request" },
        { status: 500 },
      );
    }

    // Send email notification (non-blocking)
    const emailResult = await sendAdminNotification(
      body.type,
      body.name,
      body.email,
      extractFormData(body),
    );

    if (!emailResult.success) {
      log.warn("Email notification failed", { error: emailResult.error });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contact message received",
        id: contactRequest.id,
        emailSent: emailResult.success,
      },
      { status: 200 },
    );
  } catch (error) {
    log.error("Contact form error", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
