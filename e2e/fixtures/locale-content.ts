/**
 * Locale Content Matchers
 *
 * Helper functions to verify translated content in different locales.
 */

import type { Locator } from "@playwright/test";

/**
 * Locale-specific content matchers
 *
 * Helper functions to verify translated content
 */
export const contentMatchers = {
  /**
   * Check if element contains Italian text
   */
  async hasItalianText(locator: Locator): Promise<boolean> {
    const text = await locator.textContent();
    // Common Italian words that indicate Italian content
    const italianIndicators = [
      "benvenuto",
      "ciao",
      "impostazioni",
      "profilo",
      "esci",
    ];
    return italianIndicators.some((word) => text?.toLowerCase().includes(word));
  },

  /**
   * Check if element contains English text
   */
  async hasEnglishText(locator: Locator): Promise<boolean> {
    const text = await locator.textContent();
    // Common English words that indicate English content
    const englishIndicators = [
      "welcome",
      "hello",
      "settings",
      "profile",
      "logout",
    ];
    return englishIndicators.some((word) => text?.toLowerCase().includes(word));
  },

  /**
   * Check if element contains French text
   */
  async hasFrenchText(locator: Locator): Promise<boolean> {
    const text = await locator.textContent();
    // Common French words
    const frenchIndicators = [
      "bienvenue",
      "bonjour",
      "paramètres",
      "profil",
      "déconnexion",
    ];
    return frenchIndicators.some((word) => text?.toLowerCase().includes(word));
  },

  /**
   * Check if element contains German text
   */
  async hasGermanText(locator: Locator): Promise<boolean> {
    const text = await locator.textContent();
    // Common German words
    const germanIndicators = [
      "willkommen",
      "hallo",
      "einstellungen",
      "profil",
      "abmelden",
    ];
    return germanIndicators.some((word) => text?.toLowerCase().includes(word));
  },

  /**
   * Check if element contains Spanish text
   */
  async hasSpanishText(locator: Locator): Promise<boolean> {
    const text = await locator.textContent();
    // Common Spanish words
    const spanishIndicators = [
      "bienvenido",
      "hola",
      "configuración",
      "perfil",
      "cerrar sesión",
    ];
    return spanishIndicators.some((word) => text?.toLowerCase().includes(word));
  },
};
