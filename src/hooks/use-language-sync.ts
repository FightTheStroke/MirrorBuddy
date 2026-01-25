/**
 * Language Synchronization Hook (F-70)
 * Syncs language preferences across cookie, settings store, and user profile
 *
 * Priority chain:
 * 1. User profile (if logged in)
 * 2. NEXT_LOCALE cookie
 * 3. Browser default (navigator.language)
 * 4. Default locale (it)
 */

import { useEffect, useState, useCallback } from "react";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { _validateAuth } from "@/lib/auth/session-auth";
import {
  getLanguageCookie,
  setLanguageCookie,
  getBrowserLanguage,
} from "@/lib/i18n/language-cookie";
import { defaultLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { logger } from "@/lib/logger";

interface LanguageSyncState {
  currentLanguage: Locale;
  isInitialized: boolean;
  isLoading: boolean;
}

/**
 * Hook to manage language synchronization
 *
 * Usage:
 * ```tsx
 * const { currentLanguage, changeLanguage, isInitialized } = useLanguageSync();
 * ```
 */
export function useLanguageSync() {
  const { appearance, updateAppearance, syncToServer } = useSettingsStore();
  const [state, setState] = useState<LanguageSyncState>({
    currentLanguage: defaultLocale,
    isInitialized: false,
    isLoading: true,
  });

  /**
   * Initialize language on mount
   * Priority: profile > cookie > browser > default
   */
  useEffect(() => {
    async function initializeLanguage() {
      try {
        // Priority 1: Check if user is logged in and has profile setting
        const settingsLang = appearance.language as Locale;
        if (settingsLang && settingsLang !== defaultLocale) {
          // User has a saved preference in profile (loaded by settings store)
          setState({
            currentLanguage: settingsLang,
            isInitialized: true,
            isLoading: false,
          });
          // Sync to cookie to ensure consistency
          setLanguageCookie(settingsLang);
          return;
        }

        // Priority 2: Check NEXT_LOCALE cookie
        const cookieLang = getLanguageCookie();
        if (cookieLang) {
          setState({
            currentLanguage: cookieLang,
            isInitialized: true,
            isLoading: false,
          });
          // Update store if different from default
          if (cookieLang !== defaultLocale) {
            updateAppearance({ language: cookieLang });
          }
          return;
        }

        // Priority 3: Browser language
        const browserLang = getBrowserLanguage();
        if (browserLang && browserLang !== defaultLocale) {
          setState({
            currentLanguage: browserLang,
            isInitialized: true,
            isLoading: false,
          });
          setLanguageCookie(browserLang);
          updateAppearance({ language: browserLang });
          return;
        }

        // Priority 4: Default locale
        setState({
          currentLanguage: defaultLocale,
          isInitialized: true,
          isLoading: false,
        });
      } catch (error) {
        logger.error("Language sync initialization failed", { error });
        // Fallback to default
        setState({
          currentLanguage: defaultLocale,
          isInitialized: true,
          isLoading: false,
        });
      }
    }

    initializeLanguage();
  }, [appearance.language, updateAppearance]);

  /**
   * Change language and sync to all locations
   * 1. Update cookie
   * 2. Update settings store
   * 3. Sync to profile (if logged in)
   */
  const changeLanguage = useCallback(
    async (newLanguage: Locale) => {
      try {
        // Update cookie immediately
        setLanguageCookie(newLanguage);

        // Update local state
        setState((prev) => ({
          ...prev,
          currentLanguage: newLanguage,
        }));

        // Update settings store (triggers pendingSync)
        updateAppearance({ language: newLanguage });

        // Sync to server (includes profile update)
        await syncToServer();

        logger.debug("Language changed", { language: newLanguage });
      } catch (error) {
        logger.error("Language change failed", {
          error,
          language: newLanguage,
        });
      }
    },
    [updateAppearance, syncToServer],
  );

  /**
   * Sync cookie language to profile (called after login)
   * If user logs in and has a cookie preference, sync it to their profile
   */
  const syncCookieToProfile = useCallback(async () => {
    const cookieLang = getLanguageCookie();
    if (!cookieLang) {
      return; // No cookie to sync
    }

    // If cookie language differs from profile, sync it
    if (cookieLang !== appearance.language) {
      updateAppearance({ language: cookieLang });
      await syncToServer();
      logger.debug("Synced cookie language to profile", {
        language: cookieLang,
      });
    }
  }, [appearance.language, updateAppearance, syncToServer]);

  return {
    currentLanguage: state.currentLanguage,
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    changeLanguage,
    syncCookieToProfile,
  };
}

/**
 * Hook to sync cookie language to profile after login
 * Use this in login/auth success handlers
 *
 * Usage:
 * ```tsx
 * const { syncAfterLogin } = useLanguageSyncAfterLogin();
 *
 * async function handleLogin() {
 *   // ... login logic
 *   await syncAfterLogin();
 * }
 * ```
 */
export function useLanguageSyncAfterLogin() {
  const { appearance, updateAppearance, syncToServer } = useSettingsStore();

  const syncAfterLogin = useCallback(async () => {
    const cookieLang = getLanguageCookie();
    if (!cookieLang) {
      return; // No cookie to sync
    }

    // If cookie language differs from profile, sync it
    if (cookieLang !== appearance.language) {
      updateAppearance({ language: cookieLang });
      await syncToServer();
      logger.info("Language synced after login", { language: cookieLang });
    }
  }, [appearance.language, updateAppearance, syncToServer]);

  return { syncAfterLogin };
}
