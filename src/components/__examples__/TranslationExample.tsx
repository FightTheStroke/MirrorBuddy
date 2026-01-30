/**
 * Example component demonstrating useTranslations hook usage
 *
 * This file shows different ways to use the translation hooks:
 * - Basic namespace usage
 * - Variable interpolation
 * - Common translations helper
 * - Global translations (multiple namespaces)
 *
 * NOTE: This is an example file for documentation purposes.
 * It can be safely deleted if not needed.
 */

"use client";

import {
  useTranslations,
  useCommonTranslations,
  useTranslationsGlobal,
} from "@/i18n";

export function TranslationExampleBasic() {
  // Basic usage with namespace
  const t = useTranslations("common");

  return (
    <div>
      <button>{t("save")}</button>
      <button>{t("cancel")}</button>
      <span>{t("loading")}</span>
    </div>
  );
}

export function TranslationExampleWithVariables() {
  // Using translations with variables
  const t = useTranslations("common.validation");

  return (
    <div>
      <p>{t("minLength", { min: 8 })}</p>
      <p>{t("maxLength", { max: 100 })}</p>
    </div>
  );
}

export function TranslationExampleCommon() {
  // Using the common translations helper
  const {
    save,
    cancel,
    loading,
    edit,
    delete: deleteText,
  } = useCommonTranslations();

  return (
    <div>
      <button>{save}</button>
      <button>{cancel}</button>
      <button>{edit}</button>
      <button>{deleteText}</button>
      <span>{loading}</span>
    </div>
  );
}

export function TranslationExampleGlobal() {
  // Using global translations for multiple namespaces
  const t = useTranslationsGlobal();

  return (
    <div>
      <button>{t("common.save")}</button>
      <span>{t("auth.login")}</span>
      <p>{t("errors.notFound")}</p>
      <label>{t("accessibility.skipToContent")}</label>
    </div>
  );
}

export function TranslationExampleNested() {
  // Accessing nested translation keys
  const t = useTranslations("navigation");

  return (
    <nav>
      {t("breadcrumbs.home")} {t("breadcrumbs.separator")} Products
    </nav>
  );
}
