/**
 * Hook for managing accessibility settings
 */

import { useState, useEffect } from 'react';
import type { ActiveSettings } from '../types';
import { ACCESSIBILITY_PROFILES } from '../profiles';

const DEFAULT_SETTINGS: ActiveSettings = {
  dyslexiaFont: false,
  extraLetterSpacing: false,
  increasedLineHeight: false,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  ttsEnabled: false,
  distractionFreeMode: false,
  lineSpacing: 1.0,
  fontSize: 1.0,
};

export function useAccessibilitySettings() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [settings, setSettings] = useState<ActiveSettings>(DEFAULT_SETTINGS);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Apply profile settings
  const applyProfile = (profileId: string) => {
    const profile = ACCESSIBILITY_PROFILES.find((p) => p.id === profileId);
    if (profile) {
      setActiveProfile(profileId);
      const newSettings: ActiveSettings = { ...DEFAULT_SETTINGS };
      Object.entries(profile.settings).forEach(([key, value]) => {
        if (value !== undefined) {
          newSettings[key] = value;
        }
      });
      setSettings(newSettings);
    }
  };

  // Toggle individual setting
  const toggleSetting = (key: string) => {
    setActiveProfile(null);
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Reset all settings
  const resetSettings = () => {
    setActiveProfile(null);
    setSettings(DEFAULT_SETTINGS);
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  };

  // Text-to-Speech
  const speakText = (text: string) => {
    if (!settings.ttsEnabled) return;

    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis?.speak(utterance);
    setIsSpeaking(true);
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Calculate dynamic styles based on settings
  const getTextStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (settings.dyslexiaFont) {
      styles.fontFamily = 'OpenDyslexic, sans-serif';
    }

    if (settings.extraLetterSpacing) {
      styles.letterSpacing = '0.05em';
    }

    if (settings.increasedLineHeight || settings.lineSpacing > 1.0) {
      styles.lineHeight = Math.max(1.8, settings.lineSpacing * 1.2);
    }

    if (settings.largeText || settings.fontSize > 1.0) {
      styles.fontSize = `${Math.max(1.2, settings.fontSize) * 100}%`;
    }

    return styles;
  };

  return {
    activeProfile,
    settings,
    isSpeaking,
    applyProfile,
    toggleSetting,
    resetSettings,
    speakText,
    getTextStyles,
  };
}
