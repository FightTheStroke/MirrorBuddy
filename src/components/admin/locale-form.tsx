"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { LocaleFormFields } from "./locale-form-fields";
import { csrfFetch } from "@/lib/auth";

interface LocaleFormData {
  id: string;
  countryName: string;
  primaryLocale: string;
  primaryLanguageMaestroId: string;
  secondaryLocales: string[];
  enabled: boolean;
}

interface LocaleFormProps {
  initialData?: LocaleFormData;
  mode: "create" | "edit";
}

export function LocaleForm({ initialData, mode }: LocaleFormProps) {
  const router = useRouter();
  const t = useTranslations("admin.components.localeForm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<LocaleFormData>(
    initialData || {
      id: "",
      countryName: "",
      primaryLocale: "",
      primaryLanguageMaestroId: "",
      secondaryLocales: [],
      enabled: true,
    },
  );

  const [secondaryLocalesInput, setSecondaryLocalesInput] = useState(
    initialData?.secondaryLocales.join(", ") || "",
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse secondary locales
      const secondaryLocales = secondaryLocalesInput
        .split(",")
        .map((loc) => loc.trim())
        .filter((loc) => loc.length > 0);

      const payload = {
        ...formData,
        secondaryLocales,
      };

      const url =
        mode === "create"
          ? "/api/admin/locales"
          : `/api/admin/locales/${formData.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await csrfFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save locale configuration");
      }

      router.push("/admin/locales");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/locales">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backButton")}
          </Button>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">
          {mode === "create" ? t("titleCreate") : t("titleEdit")}
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <LocaleFormFields
            formData={formData}
            setFormData={setFormData}
            secondaryLocalesInput={secondaryLocalesInput}
            setSecondaryLocalesInput={setSecondaryLocalesInput}
            mode={mode}
          />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? t("saving") : t("save")}
            </Button>
            <Link href="/admin/locales">
              <Button type="button" variant="ghost" disabled={loading}>
                {t("cancel")}
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
