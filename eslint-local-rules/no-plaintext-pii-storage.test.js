/**
 * Tests for no-plaintext-pii-storage ESLint rule
 *
 * Validates that the rule correctly detects raw Prisma queries that access PII fields.
 */

import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import noPlaintextPiiStorage from "./no-plaintext-pii-storage.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("no-plaintext-pii-storage", () => {
  it("should detect raw Prisma queries with PII fields", () => {
    ruleTester.run("no-plaintext-pii-storage", noPlaintextPiiStorage, {
      valid: [
        // Valid: Normal Prisma operations (middleware handles encryption)
        {
          code: `
            const user = await prisma.user.create({
              data: { email: "test@example.com" }
            });
          `,
          filename: "src/app/api/test.ts",
        },
        // Valid: Raw query without PII fields
        {
          code: `
            const result = await prisma.$queryRaw\`
              SELECT id, createdAt FROM "User" WHERE id = \${userId}
            \`;
          `,
          filename: "src/app/api/test.ts",
        },
        // Valid: Raw query with non-PII fields
        {
          code: `
            await prisma.$executeRaw\`
              UPDATE "User" SET tier = \${'Pro'} WHERE id = \${userId}
            \`;
          `,
          filename: "src/app/api/test.ts",
        },
      ],
      invalid: [
        // Invalid: $queryRaw with email field
        {
          code: `
            const result = await prisma.$queryRaw\`
              SELECT email FROM "User" WHERE id = \${userId}
            \`;
          `,
          filename: "src/app/api/test.ts",
          errors: [
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "email" },
            },
          ],
        },
        // Invalid: $executeRaw with email field
        {
          code: `
            await prisma.$executeRaw\`
              UPDATE "User" SET email = \${newEmail} WHERE id = \${userId}
            \`;
          `,
          filename: "src/app/api/test.ts",
          errors: [
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "email" },
            },
          ],
        },
        // Invalid: $queryRaw with name field
        {
          code: `
            const profiles = await prisma.$queryRaw\`
              SELECT name, id FROM "Profile"
            \`;
          `,
          filename: "src/app/api/test.ts",
          errors: [
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "name" },
            },
          ],
        },
        // Invalid: $queryRaw with parentEmail field
        {
          code: `
            const consent = await prisma.$queryRaw\`
              SELECT parentEmail FROM "CoppaConsent" WHERE userId = \${userId}
            \`;
          `,
          filename: "src/app/api/test.ts",
          errors: [
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "parentEmail" },
            },
          ],
        },
        // Invalid: $queryRaw with displayName field
        {
          code: `
            await prisma.$queryRaw\`
              INSERT INTO "GoogleAccount" (displayName, email) VALUES (\${name}, \${email})
            \`;
          `,
          filename: "src/app/api/test.ts",
          errors: [
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "displayName" },
            },
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "email" },
            },
          ],
        },
        // Invalid: $queryRaw with originalText field
        {
          code: `
            const kits = await prisma.$queryRaw\`
              SELECT originalText FROM "StudyKit"
            \`;
          `,
          filename: "src/app/api/test.ts",
          errors: [
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "originalText" },
            },
          ],
        },
        // Invalid: $executeRaw with html field
        {
          code: `
            await prisma.$executeRaw\`
              UPDATE "HtmlSnippet" SET html = \${content}
            \`;
          `,
          filename: "src/app/api/test.ts",
          errors: [
            {
              messageId: "plaintextPiiInRawQuery",
              data: { field: "html" },
            },
          ],
        },
      ],
    });
  });
});
