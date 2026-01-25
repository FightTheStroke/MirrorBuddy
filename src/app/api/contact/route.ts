import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFormData, sendAdminNotification } from "./helpers";
import { logger } from "@/lib/logger";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const log = logger.child({ module: "contact-api" });

/**
 * Validate email format using string parsing (ReDoS-safe alternative to regex)
 * Checks: has exactly one @, local part non-empty, domain has dot, no spaces
 */
function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return (
    local.length > 0 &&
    domain.length > 0 &&
    domain.includes(".") &&
    !email.includes(" ")
  );
}

// Valid enum values for form fields (must match frontend constants)
const VALID_SCHOOL_ROLES = ["dirigente", "docente", "segreteria", "altro"];
const VALID_SCHOOL_TYPES = [
  "primaria",
  "secondaria-i",
  "secondaria-ii",
  "università",
];
const VALID_STUDENT_COUNTS = ["100", "100-500", "500-1000", "1000+"];
const VALID_SECTORS = [
  "technology",
  "finance",
  "manufacturing",
  "healthcare",
  "retail",
  "other",
];
const VALID_EMPLOYEE_COUNTS = ["under-50", "50-200", "200-1000", "over-1000"];
const VALID_TOPICS = [
  "leadership",
  "ai-innovation",
  "soft-skills",
  "onboarding",
  "compliance",
  "other",
];

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
    // Rate limit contact form submissions (5 per hour - public endpoint)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(
      `contact:form:${clientId}`,
      RATE_LIMITS.CONTACT_FORM,
    );
    if (!rateLimitResult.success) {
      log.warn("Contact form rate limited", { clientId });
      return rateLimitResponse(
        rateLimitResult,
      ) as NextResponse<ContactResponse>;
    }

    const body = (await request.json()) as ContactRequest;

    // Validate required fields
    if (!body.name || !body.email || !body.type) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate contact type
    const validTypes = ["general", "schools", "enterprise"] as const;
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid contact type" },
        { status: 400 },
      );
    }

    // Validate field lengths to prevent abuse
    const maxLengths = {
      name: 100,
      email: 254,
      subject: 200,
      message: 5000,
      role: 100,
      schoolName: 200,
      company: 200,
      specificNeeds: 2000,
    } as const;

    for (const [field, maxLen] of Object.entries(maxLengths)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json(
          { success: false, message: `Field ${field} exceeds maximum length` },
          { status: 400 },
        );
      }
    }

    // Validate email format using string parsing (ReDoS-safe)
    if (!isValidEmail(body.email)) {
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
      // Validate enum values
      if (!VALID_SCHOOL_ROLES.includes(body.role)) {
        return NextResponse.json(
          { success: false, message: "Invalid role value" },
          { status: 400 },
        );
      }
      if (!VALID_SCHOOL_TYPES.includes(body.schoolType)) {
        return NextResponse.json(
          { success: false, message: "Invalid school type value" },
          { status: 400 },
        );
      }
      if (!VALID_STUDENT_COUNTS.includes(body.studentCount)) {
        return NextResponse.json(
          { success: false, message: "Invalid student count value" },
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
      // Validate enum values
      if (!VALID_SECTORS.includes(body.sector)) {
        return NextResponse.json(
          { success: false, message: "Invalid sector value" },
          { status: 400 },
        );
      }
      if (!VALID_EMPLOYEE_COUNTS.includes(body.employeeCount)) {
        return NextResponse.json(
          { success: false, message: "Invalid employee count value" },
          { status: 400 },
        );
      }
      // Validate all topics are valid
      const invalidTopics = body.topics.filter(
        (t) => !VALID_TOPICS.includes(t),
      );
      if (invalidTopics.length > 0) {
        return NextResponse.json(
          { success: false, message: "Invalid topic values" },
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
