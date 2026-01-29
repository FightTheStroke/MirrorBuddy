/**
 * i18n Home & Navigation Translation Tests
 * Tests that home namespace and navigation strings exist in all language files
 *
 * Updated for namespace-based structure (ADR 0082)
 */

import { describe, test, expect } from "vitest";

// Import namespace files for each locale
import itWelcome from "../../messages/it/welcome.json";
import itNavigation from "../../messages/it/navigation.json";
import itHome from "../../messages/it/home.json";
import enWelcome from "../../messages/en/welcome.json";
import enNavigation from "../../messages/en/navigation.json";
import enHome from "../../messages/en/home.json";
import frWelcome from "../../messages/fr/welcome.json";
import frNavigation from "../../messages/fr/navigation.json";
import frHome from "../../messages/fr/home.json";
import deWelcome from "../../messages/de/welcome.json";
import deNavigation from "../../messages/de/navigation.json";
import deHome from "../../messages/de/home.json";
import esWelcome from "../../messages/es/welcome.json";
import esNavigation from "../../messages/es/navigation.json";
import esHome from "../../messages/es/home.json";

// Merge namespace files to simulate runtime behavior
const itMessages = { ...itWelcome, ...itNavigation, ...itHome };
const enMessages = { ...enWelcome, ...enNavigation, ...enHome };
const frMessages = { ...frWelcome, ...frNavigation, ...frHome };
const deMessages = { ...deWelcome, ...deNavigation, ...deHome };
const esMessages = { ...esWelcome, ...esNavigation, ...esHome };

const languages = {
  it: itMessages,
  en: enMessages,
  fr: frMessages,
  de: deMessages,
  es: esMessages,
};

describe("Home Namespace Translations", () => {
  const requiredHomeKeys = [
    "appTitle",
    "loading",
    "seasonDefault",
    "mirrorBucksShort",
    "navigation.professors",
    "navigation.astuccio",
    "navigation.zaino",
    "navigation.calendar",
    "navigation.progress",
    "navigation.settings",
    "header.openMenu",
    "header.streak",
    "header.sessionsThisWeek",
    "header.studyTime",
    "header.questionsAsked",
    "header.trial",
    "header.trialClickToRequest",
    "sidebar.backToHome",
    "sidebar.appName",
    "sidebar.closeMenu",
    "sidebar.trialMode",
    "sidebar.login",
    "sidebar.requestAccess",
    "sidebar.adminDashboard",
    "sidebar.adminDashboardAria",
    "sidebar.parentArea",
  ];

  Object.entries(languages).forEach(([lang, messages]) => {
    describe(`${lang.toUpperCase()} language`, () => {
      test("should have home namespace", () => {
        expect(messages).toHaveProperty("home");
      });

      requiredHomeKeys.forEach((key) => {
        test(`should have home.${key}`, () => {
          const keys = key.split(".");
          let value: any = messages.home;

          for (const k of keys) {
            expect(value).toHaveProperty(k);
            value = value[k];
          }

          expect(typeof value).toBe("string");
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });
  });
});

describe("Navigation Namespace Extensions", () => {
  const requiredNavKeys = [
    "calendar",
    "progress",
    "parentArea",
    "adminDashboard",
  ];

  Object.entries(languages).forEach(([lang, messages]) => {
    describe(`${lang.toUpperCase()} language`, () => {
      requiredNavKeys.forEach((key) => {
        test(`should have navigation.${key}`, () => {
          expect(messages.navigation).toHaveProperty(key);
          expect(
            typeof messages.navigation[key as keyof typeof messages.navigation],
          ).toBe("string");
          expect(
            (
              messages.navigation[
                key as keyof typeof messages.navigation
              ] as string
            ).length,
          ).toBeGreaterThan(0);
        });
      });
    });
  });
});

describe("Translation Consistency", () => {
  test("all languages should have the same home namespace structure", () => {
    const languages = [
      enMessages,
      itMessages,
      frMessages,
      deMessages,
      esMessages,
    ];
    const [first, ...rest] = languages;

    rest.forEach((messages) => {
      if (first.home && messages.home) {
        expect(Object.keys(messages.home).sort()).toEqual(
          Object.keys(first.home).sort(),
        );
      }
    });
  });
});
