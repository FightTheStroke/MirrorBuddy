/**
 * Tests for Notification Store Helpers
 */

import { describe, it, expect } from "vitest";
import {
  isTypeEnabled,
  getNotificationIcon,
  playNotificationSound,
  showBrowserNotification,
} from "../notification-helpers";
import type {
  Notification,
  NotificationPreferences,
} from "../notification-store";

describe("notification-helpers", () => {
  describe("isTypeEnabled", () => {
    const allEnabledPrefs: NotificationPreferences = {
      enabled: true,
      inApp: true,
      push: true,
      sound: true,
      achievements: true,
      streaks: true,
      reminders: true,
      breaks: true,
      levelUp: true,
      sessionEnd: true,
    };

    const allDisabledPrefs: NotificationPreferences = {
      enabled: false,
      inApp: false,
      push: false,
      sound: false,
      achievements: false,
      streaks: false,
      reminders: false,
      breaks: false,
      levelUp: false,
      sessionEnd: false,
    };

    it("returns true for achievement when achievements enabled", () => {
      expect(isTypeEnabled("achievement", allEnabledPrefs)).toBe(true);
    });

    it("returns false for achievement when achievements disabled", () => {
      expect(isTypeEnabled("achievement", allDisabledPrefs)).toBe(false);
    });

    it("returns true for streak when streaks enabled", () => {
      expect(isTypeEnabled("streak", allEnabledPrefs)).toBe(true);
    });

    it("returns false for streak when streaks disabled", () => {
      expect(isTypeEnabled("streak", allDisabledPrefs)).toBe(false);
    });

    it("returns true for reminder when reminders enabled", () => {
      expect(isTypeEnabled("reminder", allEnabledPrefs)).toBe(true);
    });

    it("returns false for reminder when reminders disabled", () => {
      expect(isTypeEnabled("reminder", allDisabledPrefs)).toBe(false);
    });

    it("returns true for calendar when reminders enabled", () => {
      expect(isTypeEnabled("calendar", allEnabledPrefs)).toBe(true);
    });

    it("returns false for calendar when reminders disabled", () => {
      expect(isTypeEnabled("calendar", allDisabledPrefs)).toBe(false);
    });

    it("returns true for break when breaks enabled", () => {
      expect(isTypeEnabled("break", allEnabledPrefs)).toBe(true);
    });

    it("returns false for break when breaks disabled", () => {
      expect(isTypeEnabled("break", allDisabledPrefs)).toBe(false);
    });

    it("returns true for level_up when levelUp enabled", () => {
      expect(isTypeEnabled("level_up", allEnabledPrefs)).toBe(true);
    });

    it("returns false for level_up when levelUp disabled", () => {
      expect(isTypeEnabled("level_up", allDisabledPrefs)).toBe(false);
    });

    it("returns true for session_end when sessionEnd enabled", () => {
      expect(isTypeEnabled("session_end", allEnabledPrefs)).toBe(true);
    });

    it("returns false for session_end when sessionEnd disabled", () => {
      expect(isTypeEnabled("session_end", allDisabledPrefs)).toBe(false);
    });

    it("always returns true for system notifications", () => {
      expect(isTypeEnabled("system", allDisabledPrefs)).toBe(true);
      expect(isTypeEnabled("system", allEnabledPrefs)).toBe(true);
    });
  });

  describe("getNotificationIcon", () => {
    it("returns achievement icon", () => {
      expect(getNotificationIcon("achievement")).toBe("/icons/achievement.png");
    });

    it("returns streak icon", () => {
      expect(getNotificationIcon("streak")).toBe("/icons/streak.png");
    });

    it("returns reminder icon", () => {
      expect(getNotificationIcon("reminder")).toBe("/icons/reminder.png");
    });

    it("returns break icon", () => {
      expect(getNotificationIcon("break")).toBe("/icons/break.png");
    });

    it("returns session_end icon", () => {
      expect(getNotificationIcon("session_end")).toBe("/icons/session.png");
    });

    it("returns level_up icon", () => {
      expect(getNotificationIcon("level_up")).toBe("/icons/levelup.png");
    });

    it("returns calendar icon", () => {
      expect(getNotificationIcon("calendar")).toBe("/icons/calendar.png");
    });

    it("returns system icon", () => {
      expect(getNotificationIcon("system")).toBe("/icons/system.png");
    });
  });

  describe("playNotificationSound", () => {
    it("does not throw when AudioContext unavailable", () => {
      // In Node.js environment, AudioContext is not available
      // The function should handle this gracefully
      expect(() => playNotificationSound()).not.toThrow();
    });
  });

  describe("showBrowserNotification", () => {
    it("does not throw when Notification API unavailable", () => {
      // In Node.js environment, Notification is not available
      // The function should handle this gracefully
      const notification: Notification = {
        id: "test-1",
        type: "achievement",
        title: "Test Title",
        message: "Test Message",
        read: false,
        timestamp: new Date(),
      };

      expect(() => showBrowserNotification(notification)).not.toThrow();
    });
  });
});
