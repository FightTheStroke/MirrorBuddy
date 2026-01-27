/**
 * Unit tests for useLanguageSync hook
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useLanguageSync,
  useLanguageSyncAfterLogin,
} from "../use-language-sync";
import * as languageCookie from "@/lib/i18n/language-cookie";
import { useSettingsStore } from "@/lib/stores/settings-store";

// Mock dependencies
vi.mock("@/lib/i18n/language-cookie");
vi.mock("@/lib/logger");

describe("useLanguageSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset settings store
    useSettingsStore.setState({
      appearance: { language: "it", theme: "system", accentColor: "blue" },
      pendingSync: false,
    });
  });

  describe("initialization", () => {
    it("should use profile language if available", async () => {
      // Setup: User has saved preference
      useSettingsStore.setState({
        appearance: { language: "en", theme: "system", accentColor: "blue" },
      });
      vi.mocked(languageCookie.getLanguageCookie).mockReturnValue("fr");

      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should use profile language (en), not cookie (fr)
      expect(result.current.currentLanguage).toBe("en");
      // Should sync profile to cookie
      expect(languageCookie.setLanguageCookie).toHaveBeenCalledWith("en");
    });

    it("should use cookie language if no profile setting", async () => {
      vi.mocked(languageCookie.getLanguageCookie).mockReturnValue("fr");
      vi.mocked(languageCookie.getBrowserLanguage).mockReturnValue("en");

      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.currentLanguage).toBe("fr");
    });

    it("should use browser language if no cookie or profile", async () => {
      vi.mocked(languageCookie.getLanguageCookie).mockReturnValue(null);
      vi.mocked(languageCookie.getBrowserLanguage).mockReturnValue("es");

      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.currentLanguage).toBe("es");
      expect(languageCookie.setLanguageCookie).toHaveBeenCalledWith("es");
    });

    it("should use default locale as final fallback", async () => {
      vi.mocked(languageCookie.getLanguageCookie).mockReturnValue(null);
      vi.mocked(languageCookie.getBrowserLanguage).mockReturnValue(null);

      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.currentLanguage).toBe("it");
    });
  });

  describe("changeLanguage", () => {
    it("should update cookie, store, and sync to server", async () => {
      const syncToServerMock = vi.fn().mockResolvedValue(undefined);
      useSettingsStore.setState({
        syncToServer: syncToServerMock,
      });

      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.changeLanguage("de");

      // Should update cookie
      expect(languageCookie.setLanguageCookie).toHaveBeenCalledWith("de");

      // Should update store
      const state = useSettingsStore.getState();
      expect(state.appearance.language).toBe("de");

      // Should sync to server
      expect(syncToServerMock).toHaveBeenCalled();
    });

    it("should update local state immediately", async () => {
      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.changeLanguage("fr");

      expect(result.current.currentLanguage).toBe("fr");
    });
  });

  describe("syncCookieToProfile", () => {
    it("should sync cookie to profile if different", async () => {
      const syncToServerMock = vi.fn().mockResolvedValue(undefined);

      // Setup: User logged in with profile language "it"
      useSettingsStore.setState({
        appearance: { language: "it", theme: "system", accentColor: "blue" },
        syncToServer: syncToServerMock,
        pendingSync: false,
      });

      // No cookie initially
      vi.mocked(languageCookie.getLanguageCookie)
        .mockReturnValueOnce(null) // During initialization
        .mockReturnValueOnce("fr"); // When syncCookieToProfile is called

      vi.mocked(languageCookie.getBrowserLanguage).mockReturnValue(null);

      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Clear mocks from initialization
      syncToServerMock.mockClear();

      // Now user sets a cookie (e.g., from settings) and we sync
      await result.current.syncCookieToProfile();

      const state = useSettingsStore.getState();
      expect(state.appearance.language).toBe("fr");
      expect(syncToServerMock).toHaveBeenCalled();
    });

    it("should not sync if cookie matches profile", async () => {
      const syncToServerMock = vi.fn().mockResolvedValue(undefined);
      useSettingsStore.setState({
        appearance: { language: "en", theme: "system", accentColor: "blue" },
        syncToServer: syncToServerMock,
      });
      vi.mocked(languageCookie.getLanguageCookie).mockReturnValue("en");

      const { result } = renderHook(() => useLanguageSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.syncCookieToProfile();

      expect(syncToServerMock).not.toHaveBeenCalled();
    });
  });
});

describe("useLanguageSyncAfterLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      appearance: { language: "it", theme: "system", accentColor: "blue" },
      pendingSync: false,
    });
  });

  it("should sync cookie to profile after login", async () => {
    const syncToServerMock = vi.fn().mockResolvedValue(undefined);
    useSettingsStore.setState({
      syncToServer: syncToServerMock,
    });
    vi.mocked(languageCookie.getLanguageCookie).mockReturnValue("fr");

    const { result } = renderHook(() => useLanguageSyncAfterLogin());

    await result.current.syncAfterLogin();

    const state = useSettingsStore.getState();
    expect(state.appearance.language).toBe("fr");
    expect(syncToServerMock).toHaveBeenCalled();
  });

  it("should not sync if no cookie exists", async () => {
    const syncToServerMock = vi.fn().mockResolvedValue(undefined);
    useSettingsStore.setState({
      syncToServer: syncToServerMock,
    });
    vi.mocked(languageCookie.getLanguageCookie).mockReturnValue(null);

    const { result } = renderHook(() => useLanguageSyncAfterLogin());

    await result.current.syncAfterLogin();

    expect(syncToServerMock).not.toHaveBeenCalled();
  });
});
