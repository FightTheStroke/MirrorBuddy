/**
 * @file buddy-greetings.test.ts
 * @brief Tests for buddy language-aware greetings
 *
 * Verifies that all buddies generate greetings in the requested language.
 */

import { describe, it, expect } from "vitest";
import { getCharacterInfo } from "@/components/conversation/character-chat-view/utils/character-utils";

describe("Buddy Language-Aware Greetings", () => {
  const buddies = [
    "mario",
    "noemi",
    "enea",
    "bruno",
    "sofia",
    "marta",
  ] as const;

  describe("Spanish greetings", () => {
    it.each(buddies)("%s generates Spanish greeting", (buddyId) => {
      const info = getCharacterInfo(buddyId, "buddy", "es");
      expect(info.greeting).toMatch(/¡Hola!|Hola/);
      expect(info.greeting).not.toContain("Ehi!");
      expect(info.greeting).not.toContain("Sono");
    });
  });

  describe("French greetings", () => {
    it.each(buddies)("%s generates French greeting", (buddyId) => {
      const info = getCharacterInfo(buddyId, "buddy", "fr");
      expect(info.greeting).toMatch(/Bonjour!|Salut!/);
      expect(info.greeting).not.toContain("Ehi!");
      expect(info.greeting).not.toContain("Sono");
    });
  });

  describe("German greetings", () => {
    it.each(buddies)("%s generates German greeting", (buddyId) => {
      const info = getCharacterInfo(buddyId, "buddy", "de");
      expect(info.greeting).toMatch(/Hallo!|Hi!/);
      expect(info.greeting).not.toContain("Ehi!");
      expect(info.greeting).not.toContain("Sono");
    });
  });

  describe("English greetings", () => {
    it.each(buddies)("%s generates English greeting", (buddyId) => {
      const info = getCharacterInfo(buddyId, "buddy", "en");
      expect(info.greeting).toMatch(/Hi!|Hey!/);
      expect(info.greeting).not.toContain("Ehi!");
      expect(info.greeting).not.toContain("Sono");
    });
  });

  describe("Italian greetings (baseline)", () => {
    it.each(buddies)("%s generates Italian greeting", (buddyId) => {
      const info = getCharacterInfo(buddyId, "buddy", "it");
      expect(info.greeting).toMatch(/Ehi!|Ciao!/);
      expect(info.greeting).toContain("Sono");
    });
  });
});
