/**
 * Character Consistency Test
 *
 * Ensures all coaches and buddies defined in data files are also
 * present in UI components. Prevents "missing character" bugs when
 * adding new coaches or buddies.
 *
 * @see ADR-0060 (if created)
 */

import { describe, it, expect } from "vitest";
import { getAllSupportTeachers } from "@/data/support-teachers/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles/buddy-profiles";
import {
  COACHES,
  BUDDIES,
} from "@/components/settings/sections/character-settings-data";
import { COACH_INFO, BUDDY_INFO } from "@/app/home-constants";

describe("Character Consistency", () => {
  describe("Coaches", () => {
    it("all coaches in data should be in settings UI", () => {
      const dataCoachIds = getAllSupportTeachers().map((c) => c.id);
      const uiCoachIds = COACHES.map((c) => c.id);

      for (const id of dataCoachIds) {
        expect(
          uiCoachIds,
          `Coach "${id}" is in data but missing from character-settings-data.ts COACHES`,
        ).toContain(id);
      }
    });

    it("all coaches in data should be in home-constants", () => {
      const dataCoachIds = getAllSupportTeachers().map((c) => c.id);
      const homeCoachIds = Object.keys(COACH_INFO);

      for (const id of dataCoachIds) {
        expect(
          homeCoachIds,
          `Coach "${id}" is in data but missing from home-constants.ts COACH_INFO`,
        ).toContain(id);
      }
    });

    it("UI coaches should match data coaches (no orphans)", () => {
      const dataCoachIds = getAllSupportTeachers().map((c) => c.id);
      const uiCoachIds = COACHES.map((c) => c.id);

      for (const id of uiCoachIds) {
        expect(
          dataCoachIds,
          `Coach "${id}" is in UI but missing from support-teachers data`,
        ).toContain(id);
      }
    });

    it("all coaches should have avatar files referenced", () => {
      const coaches = getAllSupportTeachers();
      for (const coach of coaches) {
        expect(
          coach.avatar,
          `Coach "${coach.id}" is missing avatar path`,
        ).toBeTruthy();
        expect(
          coach.avatar.startsWith("/avatars/"),
          `Coach "${coach.id}" avatar should start with /avatars/`,
        ).toBe(true);
      }
    });
  });

  describe("Buddies", () => {
    it("all buddies in data should be in settings UI", () => {
      const dataBuddyIds = getAllBuddies().map((b) => b.id);
      const uiBuddyIds = BUDDIES.map((b) => b.id);

      for (const id of dataBuddyIds) {
        expect(
          uiBuddyIds,
          `Buddy "${id}" is in data but missing from character-settings-data.ts BUDDIES`,
        ).toContain(id);
      }
    });

    it("all buddies in data should be in home-constants", () => {
      const dataBuddyIds = getAllBuddies().map((b) => b.id);
      const homeBuddyIds = Object.keys(BUDDY_INFO);

      for (const id of dataBuddyIds) {
        expect(
          homeBuddyIds,
          `Buddy "${id}" is in data but missing from home-constants.ts BUDDY_INFO`,
        ).toContain(id);
      }
    });

    it("UI buddies should match data buddies (no orphans)", () => {
      const dataBuddyIds = getAllBuddies().map((b) => b.id);
      const uiBuddyIds = BUDDIES.map((b) => b.id);

      for (const id of uiBuddyIds) {
        expect(
          dataBuddyIds,
          `Buddy "${id}" is in UI but missing from buddy-profiles data`,
        ).toContain(id);
      }
    });

    it("all buddies should have avatar files referenced", () => {
      const buddies = getAllBuddies();
      for (const buddy of buddies) {
        expect(
          buddy.avatar,
          `Buddy "${buddy.id}" is missing avatar path`,
        ).toBeTruthy();
        expect(
          buddy.avatar.startsWith("/avatars/"),
          `Buddy "${buddy.id}" avatar should start with /avatars/`,
        ).toBe(true);
      }
    });
  });

  describe("Type Consistency", () => {
    it("should have same number of coaches in data and UI", () => {
      const dataCount = getAllSupportTeachers().length;
      const uiCount = COACHES.length;
      const homeCount = Object.keys(COACH_INFO).length;

      expect(uiCount).toBe(dataCount);
      expect(homeCount).toBe(dataCount);
    });

    it("should have same number of buddies in data and UI", () => {
      const dataCount = getAllBuddies().length;
      const uiCount = BUDDIES.length;
      const homeCount = Object.keys(BUDDY_INFO).length;

      expect(uiCount).toBe(dataCount);
      expect(homeCount).toBe(dataCount);
    });
  });
});
