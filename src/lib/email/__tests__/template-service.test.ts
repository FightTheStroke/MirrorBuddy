/**
 * Email Template Service Tests - TDD Implementation
 * Tests CRUD operations, variable validation, rendering, and XSS prevention
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  escapeHtml,
} from "../template-service";

// Mock Prisma and logger
vi.mock("@/lib/db", () => ({
  prisma: {
    emailTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

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

const { prisma } = await vi.importMock<typeof import("@/lib/db")>("@/lib/db");
const mockFindMany = vi.mocked(prisma.emailTemplate.findMany);
const mockFindUnique = vi.mocked(prisma.emailTemplate.findUnique);
const mockCreate = vi.mocked(prisma.emailTemplate.create);
const mockUpdate = vi.mocked(prisma.emailTemplate.update);
const mockDelete = vi.mocked(prisma.emailTemplate.delete);

const createMockTemplate = (overrides = {}) => ({
  id: "tpl-1",
  name: "Test Template",
  subject: "Hello {{name}}",
  htmlBody: "<p>Hello {{name}}</p>",
  textBody: "Hello {{name}}",
  category: "test",
  variables: JSON.stringify(["name"]),
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

describe("Email Template Service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("escapeHtml", () => {
    it("should escape HTML entities to prevent XSS", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
      );
      expect(escapeHtml('Test & "quotes"')).toBe(
        "Test &amp; &quot;quotes&quot;",
      );
    });
  });

  describe("listTemplates", () => {
    it("should return all templates without filters", async () => {
      mockFindMany.mockResolvedValueOnce([
        createMockTemplate({ id: "tpl-1" }),
        createMockTemplate({ id: "tpl-2", category: "newsletter" }),
      ]);

      const result = await listTemplates();

      expect(result).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by category", async () => {
      mockFindMany.mockResolvedValueOnce([createMockTemplate()]);
      await listTemplates({ category: "test" });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { category: "test" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by isActive", async () => {
      mockFindMany.mockResolvedValueOnce([createMockTemplate()]);
      await listTemplates({ isActive: true });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by both category and isActive", async () => {
      mockFindMany.mockResolvedValueOnce([createMockTemplate()]);
      await listTemplates({ category: "test", isActive: true });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { category: "test", isActive: true },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("getTemplate", () => {
    it("should return template by ID", async () => {
      mockFindUnique.mockResolvedValueOnce(createMockTemplate());
      const result = await getTemplate("tpl-1");
      expect(result?.id).toBe("tpl-1");
      expect(result?.variables).toEqual(["name"]);
    });

    it("should return null if not found", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      expect(await getTemplate("none")).toBeNull();
    });
  });

  describe("createTemplate", () => {
    it("should create template with valid variables", async () => {
      const data = {
        name: "New",
        subject: "Hi {{name}}",
        htmlBody: "<p>Hi {{name}}</p>",
        textBody: "Hi {{name}}",
        category: "test",
        variables: ["name", "email"],
      };

      mockCreate.mockResolvedValueOnce({
        ...createMockTemplate(),
        variables: JSON.stringify(data.variables),
      });

      const result = await createTemplate(data);
      expect(result.variables).toEqual(["name", "email"]);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { ...data, isActive: true },
      });
    });

    it("should reject invalid variables", async () => {
      await expect(
        createTemplate({
          name: "Bad",
          subject: "Test",
          htmlBody: "<p>Test</p>",
          textBody: "Test",
          category: "test",
          variables: ["invalid"],
        }),
      ).rejects.toThrow("Unsupported template variables: invalid");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should default isActive to true", async () => {
      mockCreate.mockResolvedValueOnce(createMockTemplate());
      await createTemplate({
        name: "Test",
        subject: "Test",
        htmlBody: "Test",
        textBody: "Test",
        category: "test",
        variables: [],
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ isActive: true }),
      });
    });
  });

  describe("updateTemplate", () => {
    it("should update template fields", async () => {
      const updates = { subject: "New Subject", isActive: false };
      mockUpdate.mockResolvedValueOnce(createMockTemplate({ ...updates }));

      const result = await updateTemplate("tpl-1", updates);
      expect(result.subject).toBe("New Subject");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "tpl-1" },
        data: updates,
      });
    });

    it("should validate variables when updating", async () => {
      await expect(
        updateTemplate("tpl-1", { variables: ["bad"] }),
      ).rejects.toThrow("Unsupported template variables: bad");
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("deleteTemplate", () => {
    it("should delete template by ID", async () => {
      mockDelete.mockResolvedValueOnce(createMockTemplate());
      const result = await deleteTemplate("tpl-1");
      expect(result.id).toBe("tpl-1");
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "tpl-1" } });
    });
  });

  describe("renderTemplate", () => {
    it("should replace {{variables}} with values", async () => {
      mockFindUnique.mockResolvedValueOnce(
        createMockTemplate({
          subject: "Hi {{name}}",
          htmlBody: "<p>Welcome {{name}}, {{email}}</p>",
          textBody: "Welcome {{name}}, {{email}}",
          variables: JSON.stringify(["name", "email"]),
        }),
      );

      const result = await renderTemplate("tpl-1", {
        name: "Alice",
        email: "alice@test.com",
      });

      expect(result.subject).toBe("Hi Alice");
      expect(result.htmlBody).toBe("<p>Welcome Alice, alice@test.com</p>");
      expect(result.textBody).toBe("Welcome Alice, alice@test.com");
    });

    it("should escape HTML in variables to prevent XSS", async () => {
      mockFindUnique.mockResolvedValueOnce(
        createMockTemplate({
          subject: "Hi {{name}}",
          htmlBody: "<p>{{comment}}</p>",
          variables: JSON.stringify(["name", "comment"]),
        }),
      );

      const result = await renderTemplate("tpl-1", {
        name: "<script>alert('xss')</script>",
        comment: "Test & <b>bold</b>",
      });

      expect(result.subject).toBe(
        "Hi &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
      );
      expect(result.htmlBody).toBe("<p>Test &amp; &lt;b&gt;bold&lt;/b&gt;</p>");
    });

    it("should leave unknown {{variables}} as-is", async () => {
      mockFindUnique.mockResolvedValueOnce(
        createMockTemplate({
          htmlBody: "<p>{{name}} {{missing}} {{other}}</p>",
          variables: JSON.stringify(["name", "missing", "other"]),
        }),
      );

      const result = await renderTemplate("tpl-1", { name: "Bob" });
      expect(result.htmlBody).toBe("<p>Bob {{missing}} {{other}}</p>");
    });

    it("should throw error if template not found", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      await expect(renderTemplate("none", {})).rejects.toThrow(
        "Template not found: none",
      );
    });
  });
});
