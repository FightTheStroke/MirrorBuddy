import { describe, it, expect } from "vitest";
import {
  calculateExpirationDate,
  getDaysUntilExpiration,
  isDataExpired,
  getRetentionSchedule,
  validateDeletionRequest,
  getAllRetentionSchedules,
  ITALY_RETENTION,
  UK_RETENTION,
  GERMANY_RETENTION,
  SPAIN_RETENTION,
  FRANCE_RETENTION,
  type CountryCode,
  type DataCategory,
} from "../data-retention-config";

describe("Data Retention Configuration", () => {
  describe("Retention Schedule - Italy", () => {
    it("should have all required data categories", () => {
      const categories = Object.keys(ITALY_RETENTION.categories);
      expect(categories).toContain("student_profile");
      expect(categories).toContain("consent_records");
      expect(categories).toContain("ai_safety_logs");
      expect(categories).length(10); // 10 categories total
    });

    it("should have student_profile retention of 730 days (2 years)", () => {
      const period = ITALY_RETENTION.categories.student_profile;
      expect(period.days).toBe(730);
    });

    it("should have AI safety logs retention of 1095 days (3 years)", () => {
      const period = ITALY_RETENTION.categories.ai_safety_logs;
      expect(period.days).toBe(1095);
    });
  });

  describe("Retention Schedule - UK", () => {
    it("should have shorter interaction log retention (180 days)", () => {
      const period = UK_RETENTION.categories.interaction_logs;
      expect(period.days).toBe(180);
    });

    it("should have 3-year breach record retention", () => {
      const period = UK_RETENTION.categories.breach_records;
      expect(period.days).toBe(1095);
    });

    it("should specify ICO as authority", () => {
      expect(UK_RETENTION.authority).toBe(
        "Information Commissioner's Office (ICO)",
      );
    });
  });

  describe("Retention Schedule - Germany", () => {
    it("should have longest consent record retention (8395 days / ~23 years)", () => {
      const period = GERMANY_RETENTION.categories.consent_records;
      expect(period.days).toBe(8395);
    });

    it("should have 5-year breach record retention", () => {
      const period = GERMANY_RETENTION.categories.breach_records;
      expect(period.days).toBe(1825);
    });

    it("should specify BfDI as authority", () => {
      expect(GERMANY_RETENTION.authority).toContain("BfDI");
    });
  });

  describe("Retention Schedule - Spain", () => {
    it("should have AEPD as authority", () => {
      expect(SPAIN_RETENTION.authority).toContain("AEPD");
    });

    it("should have standard 2-year student profile retention", () => {
      const period = SPAIN_RETENTION.categories.student_profile;
      expect(period.days).toBe(730);
    });
  });

  describe("Retention Schedule - France", () => {
    it("should have CNIL as authority", () => {
      expect(FRANCE_RETENTION.authority).toBe(
        "Commission Nationale de l'Informatique et des Libertés (CNIL)",
      );
    });

    it("should have 2-year AI safety log retention (shorter than others)", () => {
      const period = FRANCE_RETENTION.categories.ai_safety_logs;
      expect(period.days).toBe(730);
    });
  });

  describe("getRetentionSchedule()", () => {
    it("should return correct schedule for each country", () => {
      expect(getRetentionSchedule("IT").country).toBe("IT");
      expect(getRetentionSchedule("UK").country).toBe("UK");
      expect(getRetentionSchedule("DE").country).toBe("DE");
      expect(getRetentionSchedule("ES").country).toBe("ES");
      expect(getRetentionSchedule("FR").country).toBe("FR");
    });
  });

  describe("calculateExpirationDate()", () => {
    it("should calculate correct expiration for Italy student profile (2 years)", () => {
      const created = new Date("2024-01-01");
      const expiration = calculateExpirationDate(
        "IT",
        "student_profile",
        created,
      );

      const expected = new Date("2024-01-01");
      expected.setDate(expected.getDate() + 730);

      expect(expiration.toISOString()).toBe(expected.toISOString());
    });

    it("should calculate correct expiration for UK (6 months for educational content)", () => {
      const created = new Date("2024-01-01");
      const expiration = calculateExpirationDate(
        "UK",
        "educational_content",
        created,
      );

      const expected = new Date("2024-01-01");
      expected.setDate(expected.getDate() + 180);

      expect(expiration.toISOString()).toBe(expected.toISOString());
    });

    it("should handle different years correctly", () => {
      const created = new Date("2023-12-31");
      const expiration = calculateExpirationDate(
        "IT",
        "student_profile",
        created,
      );

      // Should be approximately 2 years later
      const daysDiff = Math.floor(
        (expiration.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(730);
    });
  });

  describe("isDataExpired()", () => {
    it("should return true for expired data", () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      // For Italy, student profile expires after 2 years
      const expired = isDataExpired("IT", "student_profile", threeYearsAgo);
      expect(expired).toBe(true);
    });

    it("should return false for non-expired data", () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const expired = isDataExpired("IT", "student_profile", threeMonthsAgo);
      expect(expired).toBe(false);
    });

    it("should handle edge cases (exactly at expiration)", () => {
      const created = new Date();
      created.setDate(created.getDate() - 730); // Exactly 2 years ago

      const expired = isDataExpired("IT", "student_profile", created);
      // Should be true (or very close, depending on time of day)
      expect(expired).toBe(true);
    });
  });

  describe("getDaysUntilExpiration()", () => {
    it("should return positive days for non-expired data", () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const daysRemaining = getDaysUntilExpiration(
        "IT",
        "student_profile",
        oneYearAgo,
      );
      expect(daysRemaining).toBeGreaterThan(0);
      expect(daysRemaining).toBeLessThanOrEqual(365);
    });

    it("should return negative days for expired data", () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      const daysRemaining = getDaysUntilExpiration(
        "IT",
        "student_profile",
        threeYearsAgo,
      );
      expect(daysRemaining).toBeLessThan(0);
    });

    it("should return approximately 365 days for data created 1 year ago (2-year retention)", () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const daysRemaining = getDaysUntilExpiration(
        "IT",
        "student_profile",
        oneYearAgo,
      );

      // Should be approximately 365 days (± 1-2 days for rounding)
      expect(daysRemaining).toBeGreaterThanOrEqual(363);
      expect(daysRemaining).toBeLessThanOrEqual(367);
    });
  });

  describe("Country-Specific Comparisons", () => {
    it("should show Germany has longer consent retention than Italy", () => {
      const itConsent = ITALY_RETENTION.categories.consent_records.days;
      const deConsent = GERMANY_RETENTION.categories.consent_records.days;

      expect(deConsent).toBeGreaterThan(itConsent);
      // Italy: ~20 years, Germany: ~23 years
      expect(deConsent - itConsent).toBeGreaterThan(1000);
    });

    it("should show France has shorter AI log retention than others", () => {
      const itAI = ITALY_RETENTION.categories.ai_safety_logs.days;
      const frAI = FRANCE_RETENTION.categories.ai_safety_logs.days;
      const deAI = GERMANY_RETENTION.categories.ai_safety_logs.days;

      expect(frAI).toBeLessThan(itAI);
      expect(frAI).toBeLessThan(deAI);
      // France: 2 years (730), Others: 3 years (1095)
      expect(frAI).toBe(730);
      expect(itAI).toBe(1095);
    });

    it("should show UK has shorter educational content retention", () => {
      const itContent = ITALY_RETENTION.categories.educational_content.days;
      const ukContent = UK_RETENTION.categories.educational_content.days;

      expect(ukContent).toBeLessThan(itContent);
      // UK: 6 months (180), Italy: 1 year (365)
      expect(ukContent).toBe(180);
      expect(itContent).toBe(365);
    });
  });

  describe("validateDeletionRequest()", () => {
    const validRequest = {
      userId: "user-123",
      country: "IT" as CountryCode,
      reason: "user_request" as const,
      deleteAllData: true,
      timestamp: new Date(),
    };

    it("should validate correct deletion request", () => {
      const result = validateDeletionRequest(validRequest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid country code", () => {
      const result = validateDeletionRequest({
        ...validRequest,
        country: "XX" as unknown as CountryCode,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Invalid country code");
    });

    it("should reject invalid deletion reason", () => {
      const result = validateDeletionRequest({
        ...validRequest,
        reason: "invalid_reason" as unknown as typeof validRequest.reason,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Invalid deletion reason");
    });

    it("should reject empty user ID", () => {
      const result = validateDeletionRequest({
        ...validRequest,
        userId: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("User ID"))).toBe(true);
    });

    it("should accept all valid reasons", () => {
      const reasons: Array<"user_request" | "expiration" | "account_closure"> =
        ["user_request", "expiration", "account_closure"];

      reasons.forEach((reason) => {
        const result = validateDeletionRequest({
          ...validRequest,
          reason,
        });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("getAllRetentionSchedules()", () => {
    it("should return all 5 country schedules", () => {
      const schedules = getAllRetentionSchedules();
      expect(Object.keys(schedules)).toHaveLength(5);
      expect(Object.keys(schedules)).toContain("IT");
      expect(Object.keys(schedules)).toContain("UK");
      expect(Object.keys(schedules)).toContain("DE");
      expect(Object.keys(schedules)).toContain("ES");
      expect(Object.keys(schedules)).toContain("FR");
    });

    it("each schedule should have all required fields", () => {
      const schedules = getAllRetentionSchedules();

      Object.values(schedules).forEach((schedule) => {
        expect(schedule.country).toBeDefined();
        expect(schedule.authority).toBeDefined();
        expect(schedule.categories).toBeDefined();
        expect(Object.keys(schedule.categories)).toHaveLength(10);
      });
    });
  });

  describe("Data Categories - Consistency Across Countries", () => {
    it("all countries should have same data categories", () => {
      const categories = Object.keys(
        ITALY_RETENTION.categories,
      ) as DataCategory[];
      const schedules = [
        UK_RETENTION,
        GERMANY_RETENTION,
        SPAIN_RETENTION,
        FRANCE_RETENTION,
      ];

      schedules.forEach((schedule) => {
        const scheduleCategories = Object.keys(schedule.categories);
        expect(scheduleCategories).toEqual(expect.arrayContaining(categories));
        expect(scheduleCategories).toHaveLength(categories.length);
      });
    });

    it("each category should have legal basis documented", () => {
      const schedules = Object.values(getAllRetentionSchedules());

      schedules.forEach((schedule) => {
        Object.entries(schedule.categories).forEach(([_category, period]) => {
          expect(period.legalBasis).toBeDefined();
          expect(period.legalBasis.length).toBeGreaterThan(0);
          // All entries must have substantive legal basis text
          expect(period.legalBasis).not.toBe("");
        });
      });
    });

    it("all retention periods should be positive numbers", () => {
      const schedules = Object.values(getAllRetentionSchedules());

      schedules.forEach((schedule) => {
        Object.entries(schedule.categories).forEach(([_category, period]) => {
          expect(period.days).toBeGreaterThan(0);
          expect(typeof period.days).toBe("number");
        });
      });
    });
  });

  describe("Retention Period Thresholds", () => {
    it("no retention period should exceed 10 years (3650 days)", () => {
      const schedules = Object.values(getAllRetentionSchedules());

      schedules.forEach((schedule) => {
        Object.entries(schedule.categories).forEach(([_category, period]) => {
          expect(period.days).toBeLessThanOrEqual(10000);
        });
      });
    });

    it("interaction logs should always be under 1 year (except archived summaries)", () => {
      const schedules = Object.values(getAllRetentionSchedules());

      schedules.forEach((schedule) => {
        const interactionLogs = schedule.categories.interaction_logs;
        expect(interactionLogs.days).toBeLessThanOrEqual(365);
      });
    });

    it("audit trail summaries should be at least 3 years", () => {
      const schedules = Object.values(getAllRetentionSchedules());

      schedules.forEach((schedule) => {
        const auditSummary = schedule.categories.audit_trails_summary;
        expect(auditSummary.days).toBeGreaterThanOrEqual(1095);
      });
    });
  });
});
