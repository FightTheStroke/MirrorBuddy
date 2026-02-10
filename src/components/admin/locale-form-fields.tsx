"use client";

import { useTranslations } from "next-intl";
import { getLanguageMaestroOptions } from "@/lib/locale/maestri-helpers";

interface LocaleFormData {
  id: string;
  countryName: string;
  primaryLocale: string;
  primaryLanguageMaestroId: string;
  secondaryLocales: string[];
  enabled: boolean;
}

interface LocaleFormFieldsProps {
  formData: LocaleFormData;
  setFormData: (data: LocaleFormData) => void;
  secondaryLocalesInput: string;
  setSecondaryLocalesInput: (value: string) => void;
  mode: "create" | "edit";
}

export function LocaleFormFields({
  formData,
  setFormData,
  secondaryLocalesInput,
  setSecondaryLocalesInput,
  mode,
}: LocaleFormFieldsProps) {
  const t = useTranslations("admin.components.localeFormFields");
  const maestroOptions = getLanguageMaestroOptions();

  return (
    <>
      {/* Country Code */}
      <div>
        <label
          htmlFor="id"
          className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
        >
          {t("countryCodeLabel")}
        </label>
        <input
          id="id"
          type="text"
          required
          disabled={mode === "edit"}
          maxLength={2}
          value={formData.id}
          onChange={(e) =>
            setFormData({ ...formData, id: e.target.value.toUpperCase() })
          }
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed font-mono"
          placeholder="IT"
        />
        <p className="text-sm text-slate-500 mt-1">{t("countryCodeHelp")}</p>
      </div>

      {/* Country Name */}
      <div>
        <label
          htmlFor="countryName"
          className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
        >
          {t("countryNameLabel")}
        </label>
        <input
          id="countryName"
          type="text"
          required
          value={formData.countryName}
          onChange={(e) =>
            setFormData({ ...formData, countryName: e.target.value })
          }
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder={t("countryNamePlaceholder")}
        />
      </div>

      {/* Primary Locale */}
      <div>
        <label
          htmlFor="primaryLocale"
          className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
        >
          {t("primaryLocaleLabel")}
        </label>
        <input
          id="primaryLocale"
          type="text"
          required
          value={formData.primaryLocale}
          onChange={(e) =>
            setFormData({
              ...formData,
              primaryLocale: e.target.value.toLowerCase(),
            })
          }
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
          placeholder={t("it")}
        />
        <p className="text-sm text-slate-500 mt-1">{t("primaryLocaleHelp")}</p>
      </div>

      {/* Primary Language Maestro */}
      <div>
        <label
          htmlFor="maestro"
          className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
        >
          {t("maestroLabel")}
        </label>
        <select
          id="maestro"
          required
          value={formData.primaryLanguageMaestroId}
          onChange={(e) =>
            setFormData({
              ...formData,
              primaryLanguageMaestroId: e.target.value,
            })
          }
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">{t("maestroPlaceholder")}</option>
          {maestroOptions.map((maestro) => (
            <option key={maestro.id} value={maestro.id}>
              {maestro.displayName} - {maestro.subjectLabel}
            </option>
          ))}
        </select>
        <p className="text-sm text-slate-500 mt-1">{t("maestroHelp")}</p>
      </div>

      {/* Secondary Locales */}
      <div>
        <label
          htmlFor="secondaryLocales"
          className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
        >
          {t("secondaryLocalesLabel")}
        </label>
        <input
          id="secondaryLocales"
          type="text"
          value={secondaryLocalesInput}
          onChange={(e) => setSecondaryLocalesInput(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
          placeholder={t("enDeFr")}
        />
        <p className="text-sm text-slate-500 mt-1">
          {t("secondaryLocalesHelp")}
        </p>
      </div>

      {/* Enabled */}
      <div className="flex items-center gap-3">
        <input
          id="enabled"
          type="checkbox"
          checked={formData.enabled}
          onChange={(e) =>
            setFormData({ ...formData, enabled: e.target.checked })
          }
          className="w-4 h-4 text-primary border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-primary"
        />
        <label
          htmlFor="enabled"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {t("enabledLabel")}
        </label>
      </div>
    </>
  );
}
