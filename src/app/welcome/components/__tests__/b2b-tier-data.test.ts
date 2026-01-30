/**
 * Unit tests for B2B tier data
 *
 * Tests verify the structure and content of createB2bTierCards
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createB2bTierCards, type TierCard } from "../b2b-tier-data";

const translations: Record<string, string> = {
  "tiers.schools.name": "Scuole",
  "tiers.schools.tagline": "Per istituti scolastici",
  "tiers.schools.price": "Personalizzato",
  "tiers.schools.badge": "Per le Scuole",
  "tiers.schools.features.curriculum": "Personalizzazione curricolare",
  "tiers.schools.features.classManagement": "Gestione classi",
  "tiers.schools.features.teacherReports": "Report docenti",
  "tiers.schools.features.dedicatedSupport": "Supporto dedicato",
  "tiers.schools.cta": "Contattaci",
  "tiers.enterprise.name": "Enterprise",
  "tiers.enterprise.tagline": "Per aziende e organizzazioni",
  "tiers.enterprise.price": "Personalizzato",
  "tiers.enterprise.features.customThemes":
    "Temi custom (Leadership, AI, Soft Skills)",
  "tiers.enterprise.features.customBranding": "Branding personalizzato",
  "tiers.enterprise.features.advancedAnalytics": "Analytics avanzate",
  "tiers.enterprise.features.accountManager": "Account manager dedicato",
  "tiers.enterprise.cta": "Contattaci",
};

const mockT = (key: string): string => translations[key] ?? key;

describe("b2b-tier-data", () => {
  const b2bTierCards = createB2bTierCards(mockT);

  it("creates an array", () => {
    expect(Array.isArray(b2bTierCards)).toBe(true);
  });

  it("contains exactly 2 cards", () => {
    expect(b2bTierCards).toHaveLength(2);
  });

  describe("Schools card (Scuole)", () => {
    let schoolCard: TierCard;

    beforeEach(() => {
      schoolCard = b2bTierCards.find(
        (card: TierCard) => card.name === "Scuole",
      )!;
    });

    it("exists in b2bTierCards", () => {
      expect(schoolCard).toBeDefined();
    });

    it("has correct name", () => {
      expect(schoolCard.name).toBe("Scuole");
    });

    it("has correct tagline", () => {
      expect(schoolCard.tagline).toBe("Per istituti scolastici");
    });

    it("has personalized pricing", () => {
      expect(schoolCard.price).toBe("Personalizzato");
    });

    it("has 4 features", () => {
      expect(schoolCard.features).toHaveLength(4);
    });

    it("includes curriculum customization feature", () => {
      const feature = schoolCard.features.find((f) =>
        f.text.toLowerCase().includes("personalizzazione curricolare"),
      );
      expect(feature).toBeDefined();
    });

    it("includes class management feature", () => {
      const feature = schoolCard.features.find((f) =>
        f.text.toLowerCase().includes("gestione classi"),
      );
      expect(feature).toBeDefined();
    });

    it("includes teacher reports feature", () => {
      const feature = schoolCard.features.find((f) =>
        f.text.toLowerCase().includes("report docenti"),
      );
      expect(feature).toBeDefined();
    });

    it("includes dedicated support feature", () => {
      const feature = schoolCard.features.find((f) =>
        f.text.toLowerCase().includes("supporto dedicato"),
      );
      expect(feature).toBeDefined();
    });

    it("has correct CTA text", () => {
      expect(schoolCard.cta.text).toBe("Contattaci");
    });

    it("has correct CTA href", () => {
      expect(schoolCard.cta.href).toBe("/contact/schools");
    });

    it("has highlight flag", () => {
      expect(schoolCard.highlight).toBe(true);
    });

    it("has 'Per le Scuole' badge", () => {
      expect(schoolCard.badge).toBe("Per le Scuole");
    });
  });

  describe("Enterprise card", () => {
    let enterpriseCard: TierCard;

    beforeEach(() => {
      enterpriseCard = b2bTierCards.find(
        (card: TierCard) => card.name === "Enterprise",
      )!;
    });

    it("exists in b2bTierCards", () => {
      expect(enterpriseCard).toBeDefined();
    });

    it("has correct name", () => {
      expect(enterpriseCard.name).toBe("Enterprise");
    });

    it("has correct tagline", () => {
      expect(enterpriseCard.tagline).toBe("Per aziende e organizzazioni");
    });

    it("has personalized pricing", () => {
      expect(enterpriseCard.price).toBe("Personalizzato");
    });

    it("does not have highlight", () => {
      expect(enterpriseCard.highlight).not.toBe(true);
    });

    it("has 4 features", () => {
      expect(enterpriseCard.features).toHaveLength(4);
    });

    it("includes custom themes feature", () => {
      const feature = enterpriseCard.features.find((f) =>
        /temi custom|leadership|ai|soft skills/i.test(f.text),
      );
      expect(feature).toBeDefined();
    });

    it("includes custom branding feature", () => {
      const feature = enterpriseCard.features.find((f) =>
        f.text.toLowerCase().includes("branding personalizzato"),
      );
      expect(feature).toBeDefined();
    });

    it("includes advanced analytics feature", () => {
      const feature = enterpriseCard.features.find((f) =>
        f.text.toLowerCase().includes("analytics avanzate"),
      );
      expect(feature).toBeDefined();
    });

    it("includes dedicated account manager feature", () => {
      const feature = enterpriseCard.features.find((f) =>
        f.text.toLowerCase().includes("account manager dedicato"),
      );
      expect(feature).toBeDefined();
    });

    it("has correct CTA text", () => {
      expect(enterpriseCard.cta.text).toBe("Contattaci");
    });

    it("has correct CTA href", () => {
      expect(enterpriseCard.cta.href).toBe("/contact/enterprise");
    });
  });

  it("uses TierCard interface correctly", () => {
    b2bTierCards.forEach((card: TierCard) => {
      expect(card).toHaveProperty("name");
      expect(card).toHaveProperty("tagline");
      expect(card).toHaveProperty("price");
      expect(card).toHaveProperty("features");
      expect(card).toHaveProperty("cta");
      expect(card.cta).toHaveProperty("text");
      expect(card.cta).toHaveProperty("href");
    });
  });

  it("all features have icon and text", () => {
    b2bTierCards.forEach((card: TierCard) => {
      card.features.forEach((feature) => {
        expect(feature).toHaveProperty("icon");
        expect(feature).toHaveProperty("text");
      });
    });
  });
});
