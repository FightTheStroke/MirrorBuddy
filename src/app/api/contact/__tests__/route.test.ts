/**
 * Tests for POST /api/contact API route
 * F-15: API for contact form submission with email notification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    contactRequest: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

const mockPrisma = prisma as unknown as {
  contactRequest: { create: ReturnType<typeof vi.fn> };
};
const mockSendEmail = sendEmail as unknown as ReturnType<typeof vi.fn>;

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@mirrorbuddy.com";
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAIL;
  });

  describe("Database persistence", () => {
    it("should save general contact request to database", async () => {
      const requestData = {
        name: "John Doe",
        email: "john@example.com",
        type: "general" as const,
        subject: "Question about platform",
        message: "I have a question",
      };

      mockPrisma.contactRequest.create.mockResolvedValue({
        id: "test-id-123",
        type: "general",
        name: "John Doe",
        email: "john@example.com",
        data: {
          subject: "Question about platform",
          message: "I have a question",
        },
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSendEmail.mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.contactRequest.create).toHaveBeenCalledWith({
        data: {
          type: "general",
          name: "John Doe",
          email: "john@example.com",
          data: {
            subject: "Question about platform",
            message: "I have a question",
          },
          status: "pending",
        },
      });
      expect(data.success).toBe(true);
      expect(data.id).toBe("test-id-123");
    });

    it("should save schools contact request with all fields", async () => {
      const requestData = {
        name: "Jane Smith",
        email: "jane@school.edu",
        type: "schools" as const,
        role: "Principal",
        schoolName: "Test High School",
        schoolType: "secondary",
        studentCount: "500-1000",
        specificNeeds: "DSA support",
      };

      mockPrisma.contactRequest.create.mockResolvedValue({
        id: "test-id-456",
        type: "schools",
        name: "Jane Smith",
        email: "jane@school.edu",
        data: {
          role: "Principal",
          schoolName: "Test High School",
          schoolType: "secondary",
          studentCount: "500-1000",
          specificNeeds: "DSA support",
        },
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSendEmail.mockResolvedValue({
        success: true,
        messageId: "msg-456",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.contactRequest.create).toHaveBeenCalledWith({
        data: {
          type: "schools",
          name: "Jane Smith",
          email: "jane@school.edu",
          data: {
            role: "Principal",
            schoolName: "Test High School",
            schoolType: "secondary",
            studentCount: "500-1000",
            specificNeeds: "DSA support",
          },
          status: "pending",
        },
      });
      expect(data.id).toBe("test-id-456");
    });

    it("should save enterprise contact request", async () => {
      const requestData = {
        name: "Bob Johnson",
        email: "bob@company.com",
        type: "enterprise" as const,
        companyName: "Tech Corp",
        industry: "Technology",
        employees: "1000+",
        message: "Need enterprise license",
      };

      mockPrisma.contactRequest.create.mockResolvedValue({
        id: "test-id-789",
        type: "enterprise",
        name: "Bob Johnson",
        email: "bob@company.com",
        data: {
          companyName: "Tech Corp",
          industry: "Technology",
          employees: "1000+",
          message: "Need enterprise license",
        },
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSendEmail.mockResolvedValue({
        success: true,
        messageId: "msg-789",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.contactRequest.create).toHaveBeenCalled();
      expect(data.id).toBe("test-id-789");
    });
  });

  describe("Email notifications", () => {
    it("should send email notification for general contact", async () => {
      const requestData = {
        name: "John Doe",
        email: "john@example.com",
        type: "general" as const,
        subject: "Question",
        message: "Test message",
      };

      mockPrisma.contactRequest.create.mockResolvedValue({
        id: "test-id",
        type: "general",
        name: "John Doe",
        email: "john@example.com",
        data: { subject: "Question", message: "Test message" },
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSendEmail.mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      await POST(request);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@mirrorbuddy.com",
          subject: expect.stringContaining("General"),
          html: expect.stringContaining("John Doe"),
        }),
      );
    });

    it("should include all form data in email for schools contact", async () => {
      const requestData = {
        name: "Jane Smith",
        email: "jane@school.edu",
        type: "schools" as const,
        role: "Principal",
        schoolName: "Test School",
        schoolType: "primary",
        studentCount: "100-500",
        specificNeeds: "DSA",
      };

      mockPrisma.contactRequest.create.mockResolvedValue({
        id: "test-id",
        type: "schools",
        name: "Jane Smith",
        email: "jane@school.edu",
        data: requestData,
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSendEmail.mockResolvedValue({
        success: true,
        messageId: "msg-456",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      await POST(request);

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall).toMatchObject({
        to: "admin@mirrorbuddy.com",
        subject: expect.stringContaining("Schools"),
      });
      expect(emailCall.html).toContain("Test School");
      expect(emailCall.html).toContain("primary");
      expect(emailCall.html).toContain("100-500");
    });

    it("should handle email send failure gracefully", async () => {
      const requestData = {
        name: "John Doe",
        email: "john@example.com",
        type: "general" as const,
        subject: "Test",
        message: "Test",
      };

      mockPrisma.contactRequest.create.mockResolvedValue({
        id: "test-id",
        type: "general",
        name: "John Doe",
        email: "john@example.com",
        data: { subject: "Test", message: "Test" },
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSendEmail.mockResolvedValue({
        success: false,
        error: "Email service unavailable",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed even if email fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.emailSent).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("should handle database errors", async () => {
      const requestData = {
        name: "John Doe",
        email: "john@example.com",
        type: "general" as const,
        subject: "Test",
        message: "Test",
      };

      mockPrisma.contactRequest.create.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Failed to save contact request");
    });

    it("should preserve existing validation", async () => {
      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify({ name: "John" }), // Missing required fields
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("Response format", () => {
    it("should return contact request ID on success", async () => {
      const requestData = {
        name: "John Doe",
        email: "john@example.com",
        type: "general" as const,
        subject: "Test",
        message: "Test",
      };

      mockPrisma.contactRequest.create.mockResolvedValue({
        id: "cuid-12345",
        type: "general",
        name: "John Doe",
        email: "john@example.com",
        data: { subject: "Test", message: "Test" },
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSendEmail.mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toMatchObject({
        success: true,
        message: expect.any(String),
        id: "cuid-12345",
        emailSent: true,
      });
    });
  });
});
