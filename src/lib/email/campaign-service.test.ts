/**
 * Email Campaign Service Tests
 * Tests for sendCampaign functionality (T3-02)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { sendCampaign } from "./campaign-service";
import * as resendLimits from "@/lib/observability/resend-limits";
import * as preferenceService from "./preference-service";
import * as templateService from "./template-service";
import * as emailService from "./index";
import { prisma } from "@/lib/db";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    emailCampaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    emailRecipient: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/observability/resend-limits");
vi.mock("./preference-service");
vi.mock("./template-service");
vi.mock("./index");
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("sendCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if campaign not found", async () => {
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(null);

    await expect(sendCampaign("invalid-id")).rejects.toThrow(
      "Campaign not found",
    );
  });

  it("should throw error if quota exceeded", async () => {
    const campaign = {
      id: "camp1",
      name: "Test Campaign",
      templateId: "tpl1",
      filters: {},
      status: "DRAFT",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: "admin1",
      template: {
        id: "tpl1",
        name: "Template",
        subject: "Subject",
        htmlBody: "<p>Body</p>",
        textBody: "Body",
        category: "announcements",
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(
      campaign as any,
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", email: "user1@test.com", profile: { name: "User 1" } },
      { id: "u2", email: "user2@test.com", profile: { name: "User 2" } },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 99, limit: 100, percent: 99, status: "warning" },
      emailsMonth: {
        used: 2998,
        limit: 3000,
        percent: 99.9,
        status: "critical",
      },
      timestamp: Date.now(),
    });

    await expect(sendCampaign("camp1")).rejects.toThrow(
      "Insufficient email quota",
    );
  });

  it("should skip recipients without consent", async () => {
    const campaign = {
      id: "camp1",
      name: "Test Campaign",
      templateId: "tpl1",
      filters: {},
      status: "DRAFT",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: "admin1",
      template: {
        id: "tpl1",
        name: "Template",
        subject: "Subject",
        htmlBody: "<p>Body</p>",
        textBody: "Body",
        category: "announcements",
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(
      campaign as any,
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", email: "user1@test.com", profile: { name: "User 1" } },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: "ok" },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: "ok" },
      timestamp: Date.now(),
    });

    vi.mocked(preferenceService.canSendTo).mockResolvedValue(false);
    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: "rec1",
      campaignId: "camp1",
      userId: "u1",
      email: "user1@test.com",
      status: "FAILED",
    } as any);

    await sendCampaign("camp1");

    expect(prisma.emailRecipient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
        }),
      }),
    );
  });

  it("should send emails with unsubscribe URL and GDPR footer", async () => {
    const campaign = {
      id: "camp1",
      name: "Test Campaign",
      templateId: "tpl1",
      filters: {},
      status: "DRAFT",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: "admin1",
      template: {
        id: "tpl1",
        name: "Template",
        subject: "Hello {{name}}",
        htmlBody: "<p>Hi {{name}}</p>",
        textBody: "Hi {{name}}",
        category: "announcements",
        variables: ["name"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(
      campaign as any,
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "u1",
        email: "user1@test.com",
        username: "user1",
        profile: { name: "User 1" },
        settings: { language: "it" },
        subscription: { tier: { code: "base" } },
      },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: "ok" },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: "ok" },
      timestamp: Date.now(),
    });

    vi.mocked(preferenceService.canSendTo).mockResolvedValue(true);
    vi.mocked(preferenceService.getPreferences).mockResolvedValue({
      id: "pref1",
      userId: "u1",
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: "token123",
      consentedAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(templateService.renderTemplate).mockResolvedValue({
      subject: "Hello User 1",
      htmlBody: "<p>Hi User 1</p>",
      textBody: "Hi User 1",
    });

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: "msg123",
    });

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: "rec1",
      campaignId: "camp1",
      userId: "u1",
      email: "user1@test.com",
      status: "SENT",
    } as any);

    await sendCampaign("camp1");

    // Verify GDPR footer was added
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Legal basis"),
      }),
    );

    // Verify unsubscribe URL
    expect(templateService.renderTemplate).toHaveBeenCalledWith(
      "tpl1",
      expect.objectContaining({
        unsubscribeUrl: expect.stringContaining("token123"),
      }),
    );
  });

  it("should update campaign status to SENT on success", async () => {
    const campaign = {
      id: "camp1",
      name: "Test Campaign",
      templateId: "tpl1",
      filters: {},
      status: "DRAFT",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: "admin1",
      template: {
        id: "tpl1",
        name: "Template",
        subject: "Subject",
        htmlBody: "<p>Body</p>",
        textBody: "Body",
        category: "announcements",
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(
      campaign as any,
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "u1",
        email: "user1@test.com",
        profile: { name: "User 1" },
        settings: { language: "it" },
      },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: "ok" },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: "ok" },
      timestamp: Date.now(),
    });

    vi.mocked(preferenceService.canSendTo).mockResolvedValue(true);
    vi.mocked(preferenceService.getPreferences).mockResolvedValue({
      id: "pref1",
      userId: "u1",
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: "token123",
      consentedAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(templateService.renderTemplate).mockResolvedValue({
      subject: "Subject",
      htmlBody: "<p>Body</p>",
      textBody: "Body",
    });

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: "msg123",
    });

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: "rec1",
      campaignId: "camp1",
      userId: "u1",
      email: "user1@test.com",
      status: "SENT",
    } as any);

    await sendCampaign("camp1");

    // Verify campaign was updated to SENDING then SENT
    expect(prisma.emailCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SENDING",
        }),
      }),
    );

    expect(prisma.emailCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SENT",
          sentCount: 1,
        }),
      }),
    );
  });
});
