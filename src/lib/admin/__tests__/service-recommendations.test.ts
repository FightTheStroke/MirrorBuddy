/**
 * Unit tests for service recommendations
 * F-20: Ogni alert nella dashboard include: azione raccomandata + link diretto per upgrade
 * F-28: Actionable recommendations per servizio
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
  getRecommendation,
  getServiceKey,
  SERVICE_KEYS,
} from "../service-recommendations";

describe("Service Recommendations", () => {
  describe("getRecommendation", () => {
    it("returns null for ok status", () => {
      const recommendation = getRecommendation("vercel", "ok");
      expect(recommendation).toBeNull();
    });

    it("returns Vercel recommendation for warning status", () => {
      const recommendation = getRecommendation("vercel", "warning");
      expect(recommendation).not.toBeNull();
      expect(recommendation?.title).toContain("Vercel Pro");
      expect(recommendation?.price).toBe("$40/mo");
      expect(recommendation?.upgradeUrl).toContain("vercel.com/upgrade");
    });

    it("returns Supabase recommendation for critical status", () => {
      const recommendation = getRecommendation("supabase", "critical");
      expect(recommendation).not.toBeNull();
      expect(recommendation?.title).toContain("Supabase Pro");
      expect(recommendation?.price).toBe("$25/mo");
      expect(recommendation?.upgradeUrl).toContain("supabase.com");
    });

    it("returns Resend recommendation for emergency status", () => {
      const recommendation = getRecommendation("resend", "emergency");
      expect(recommendation).not.toBeNull();
      expect(recommendation?.title).toContain("Resend Pro");
      expect(recommendation?.price).toBe("$20/mo");
      expect(recommendation?.upgradeUrl).toContain("resend.com/pricing");
    });

    it("returns Azure recommendation for warning status", () => {
      const recommendation = getRecommendation("azure", "warning");
      expect(recommendation).not.toBeNull();
      expect(recommendation?.title).toContain("Azure");
      expect(recommendation?.price).toBe("Contact Sales");
      expect(recommendation?.upgradeUrl).toContain("portal.azure.com");
    });

    it("returns Redis recommendation for critical status", () => {
      const recommendation = getRecommendation("redis", "critical");
      expect(recommendation).not.toBeNull();
      expect(recommendation?.title).toContain("Redis");
      expect(recommendation?.upgradeUrl).toContain("vercel.com/dashboard/stores");
    });

    it("returns null for unknown service", () => {
      const recommendation = getRecommendation("unknown", "warning");
      expect(recommendation).toBeNull();
    });
  });

  describe("getServiceKey", () => {
    it("normalizes service names to lowercase keys", () => {
      expect(getServiceKey("Vercel")).toBe("vercel");
      expect(getServiceKey("SUPABASE")).toBe("supabase");
      expect(getServiceKey("Azure OpenAI")).toBe("azure");
    });

    it("maps service variants to correct key", () => {
      expect(getServiceKey("Vercel Bandwidth")).toBe("vercel");
      expect(getServiceKey("Supabase Database")).toBe("supabase");
      expect(getServiceKey("Redis KV")).toBe("redis");
    });

    it("returns normalized input for unknown service", () => {
      expect(getServiceKey("Unknown Service")).toBe("unknown service");
    });
  });

  describe("Recommendation URLs", () => {
    it("all recommendations have valid HTTPS URLs", () => {
      const services = ["vercel", "supabase", "resend", "azure", "redis"];

      for (const service of services) {
        const rec = getRecommendation(service, "warning");
        expect(rec).not.toBeNull();
        expect(rec?.upgradeUrl).toMatch(/^https:\/\//);
      }
    });

    it("all recommendations have non-empty titles and CTAs", () => {
      const services = ["vercel", "supabase", "resend", "azure", "redis"];

      for (const service of services) {
        const rec = getRecommendation(service, "warning");
        expect(rec?.title).toBeTruthy();
        expect(rec?.title.length).toBeGreaterThan(0);
        expect(rec?.cta).toBeTruthy();
        expect(rec?.cta.length).toBeGreaterThan(0);
      }
    });
  });

  describe("SERVICE_KEYS mapping", () => {
    it("includes all major services", () => {
      expect(SERVICE_KEYS).toHaveProperty("vercel");
      expect(SERVICE_KEYS).toHaveProperty("supabase");
      expect(SERVICE_KEYS).toHaveProperty("resend");
      expect(SERVICE_KEYS).toHaveProperty("azure");
      expect(SERVICE_KEYS).toHaveProperty("redis");
    });

    it("includes service variants", () => {
      expect(SERVICE_KEYS).toHaveProperty("azure openai");
      expect(SERVICE_KEYS).toHaveProperty("redis kv");
      expect(SERVICE_KEYS).toHaveProperty("supabase database");
    });
  });
});
