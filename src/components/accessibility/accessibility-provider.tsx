"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import { SkipLink } from "./skip-link";

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({
  children,
}: AccessibilityProviderProps) {
  // Subscribe to actual settings object, not just the getter function
  // This ensures re-render when settings change
  const settings = useAccessibilityStore((state) =>
    state.currentContext === "parent" ? state.parentSettings : state.settings,
  );
  const currentContext = useAccessibilityStore((state) => state.currentContext);
  const loadFromCookie = useAccessibilityStore((state) => state.loadFromCookie);
  const applyBrowserPreferences = useAccessibilityStore(
    (state) => state.applyBrowserPreferences,
  );
  const initialized = useRef(false);

  // Load settings from cookie on mount, detect browser preferences if no cookie
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // First, try to load from cookie
    loadFromCookie();

    // If no cookie, detect and apply browser preferences
    applyBrowserPreferences();
  }, [loadFromCookie, applyBrowserPreferences]);

  // Apply accessibility classes to document
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Dyslexia font
    if (settings.dyslexiaFont) {
      html.classList.add("dyslexia-font");
      body.classList.add("dyslexia-font");
      body.style.fontFamily =
        "OpenDyslexic, 'Comic Sans MS', 'Trebuchet MS', sans-serif";
      if (settings.extraLetterSpacing) {
        html.classList.add("dyslexia-spacing");
        body.classList.add("dyslexia-spacing");
      }
      if (settings.increasedLineHeight) {
        html.classList.add("dyslexia-line-height");
        body.classList.add("dyslexia-line-height");
      }
    } else {
      body.style.fontFamily = "";
      html.classList.remove(
        "dyslexia-font",
        "dyslexia-spacing",
        "dyslexia-line-height",
      );
      body.classList.remove(
        "dyslexia-font",
        "dyslexia-spacing",
        "dyslexia-line-height",
      );
    }

    // High contrast
    if (settings.highContrast) {
      html.classList.add("high-contrast");
    } else {
      html.classList.remove("high-contrast");
    }

    // Large text
    if (settings.largeText) {
      html.classList.add("large-text");
    } else {
      html.classList.remove("large-text");
    }

    // Reduced motion
    if (settings.reducedMotion) {
      html.classList.add("reduced-motion");
    } else {
      html.classList.remove("reduced-motion");
    }

    // Color blind mode
    if (settings.colorBlindMode) {
      html.classList.add("color-blind-mode");
    } else {
      html.classList.remove("color-blind-mode");
    }

    // Distraction-free mode
    if (settings.distractionFreeMode) {
      html.classList.add("distraction-free");
    } else {
      html.classList.remove("distraction-free");
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      html.classList.add("keyboard-nav");
    } else {
      html.classList.remove("keyboard-nav");
    }

    // Custom font size
    if (settings.fontSize !== 1.0) {
      body.style.fontSize = `${settings.fontSize * 100}%`;
    } else {
      body.style.fontSize = "";
    }

    // Custom line spacing
    if (settings.lineSpacing !== 1.0) {
      body.style.lineHeight = `${settings.lineSpacing}`;
    } else {
      body.style.lineHeight = "";
    }

    // Sync with system preferences
    const syncWithSystem = () => {
      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        !settings.reducedMotion
      ) {
        // Could auto-enable reduced motion here
      }
    };

    syncWithSystem();

    const motionMediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    motionMediaQuery.addEventListener("change", syncWithSystem);

    return () => {
      motionMediaQuery.removeEventListener("change", syncWithSystem);
    };
  }, [settings, currentContext]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        document.body.classList.add("user-is-tabbing");
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove("user-is-tabbing");
    };

    window.addEventListener("keydown", handleFirstTab);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleFirstTab);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [settings.keyboardNavigation]);

  return (
    <>
      <SkipLink targetId="main-content" />
      {children}
    </>
  );
}

// Hook for TTS (Text-to-Speech)
export function useTTS() {
  const settings = useAccessibilityStore((state) =>
    state.currentContext === "parent" ? state.parentSettings : state.settings,
  );

  const speak = (text: string) => {
    if (!settings.ttsEnabled || typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.ttsSpeed;
    utterance.lang = "it-IT";

    // Try to find an Italian voice
    const voices = speechSynthesis.getVoices();
    const italianVoice = voices.find((v) => v.lang.startsWith("it"));
    if (italianVoice) {
      utterance.voice = italianVoice;
    }

    speechSynthesis.cancel(); // Cancel any ongoing speech
    speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (typeof window === "undefined") return;
    speechSynthesis.cancel();
  };

  return { speak, stop, enabled: settings.ttsEnabled };
}

// Hook for ADHD session timer
export function useADHDTimer() {
  const {
    adhdSessionState,
    adhdTimeRemaining,
    adhdSessionProgress,
    startADHDSession,
    stopADHDSession,
    completeADHDSession,
    startADHDBreak,
    tickADHDTimer,
    getFormattedTimeRemaining,
    adhdConfig,
    adhdStats,
  } = useAccessibilityStore();

  useEffect(() => {
    if (adhdSessionState !== "working" && adhdSessionState !== "breakTime") {
      return;
    }

    const interval = setInterval(() => {
      tickADHDTimer();

      // Check if session is complete
      if (adhdTimeRemaining <= 1) {
        if (adhdSessionState === "working") {
          completeADHDSession();
          // Auto-start break after a short delay
          setTimeout(() => {
            const shouldLongBreak =
              (adhdStats.completedSessions + 1) %
                adhdConfig.sessionsUntilLongBreak ===
              0;
            startADHDBreak(shouldLongBreak);
          }, 2000);
        } else if (adhdSessionState === "breakTime") {
          stopADHDSession();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    adhdSessionState,
    adhdTimeRemaining,
    tickADHDTimer,
    completeADHDSession,
    startADHDBreak,
    stopADHDSession,
    adhdConfig.sessionsUntilLongBreak,
    adhdStats.completedSessions,
  ]);

  return {
    state: adhdSessionState,
    timeRemaining: adhdTimeRemaining,
    progress: adhdSessionProgress,
    formattedTime: getFormattedTimeRemaining(),
    start: startADHDSession,
    stop: stopADHDSession,
    stats: adhdStats,
    config: adhdConfig,
  };
}
