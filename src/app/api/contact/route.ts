import { NextRequest, NextResponse } from "next/server";

interface ContactRequest {
  name: string;
  email: string;
  type: "general" | "schools" | "enterprise";
  subject?: string;
  message?: string;
  role?: string;
  schoolName?: string;
  schoolType?: string;
  studentCount?: string;
  specificNeeds?: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
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
    } else if (body.type === "general") {
      if (!body.subject || !body.message) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }
    }

    // TODO: Send email or store in database
    // For now, just acknowledge the submission
    console.log("Contact form submission:", {
      name: body.name,
      email: body.email,
      type: body.type,
    });

    return NextResponse.json(
      { success: true, message: "Contact message received" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
