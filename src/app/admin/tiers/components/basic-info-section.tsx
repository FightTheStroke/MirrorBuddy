"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

interface BasicInfoSectionProps {
  formData: {
    code: string;
    name: string;
    description: string | null;
    monthlyPriceEur: number | null;
    sortOrder: number;
    isActive: boolean;
  };
  isEditing: boolean;
  onChange: (data: Partial<BasicInfoSectionProps["formData"]>) => void;
}

export function BasicInfoSection({
  formData,
  isEditing,
  onChange,
}: BasicInfoSectionProps) {
  const t = useTranslations("admin.tiers.form");

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        {t("basicInfo")}
      </h2>

      <div className="space-y-4">
        {/* Code */}
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium mb-1 text-foreground"
          >
            {t("code")} <span className="text-red-500">*</span>
          </label>
          <Input
            id="code"
            name="code"
            type="text"
            required
            readOnly={isEditing}
            value={formData.code}
            onChange={(e) => onChange({ code: e.target.value })}
            className={
              isEditing
                ? "bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                : ""
            }
            placeholder={t("codePlaceholder")}
          />
          {isEditing && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("codeReadOnly")}
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-1 text-foreground"
          >
            {t("name")} <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t("namePlaceholder")}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-1 text-foreground"
          >
            {t("description")}
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400"
            placeholder={t("descriptionPlaceholder")}
          />
        </div>

        {/* Monthly Price */}
        <div>
          <label
            htmlFor="monthlyPriceEur"
            className="block text-sm font-medium mb-1 text-foreground"
          >
            {t("monthlyPrice")}
          </label>
          <Input
            id="monthlyPriceEur"
            name="monthlyPriceEur"
            type="number"
            step="0.01"
            min="0"
            value={formData.monthlyPriceEur || ""}
            onChange={(e) =>
              onChange({
                monthlyPriceEur: e.target.value
                  ? parseFloat(e.target.value)
                  : null,
              })
            }
            placeholder={t("monthlyPricePlaceholder")}
          />
        </div>

        {/* Sort Order */}
        <div>
          <label
            htmlFor="sortOrder"
            className="block text-sm font-medium mb-1 text-foreground"
          >
            {t("position")} <span className="text-red-500">*</span>
          </label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            required
            min="0"
            value={formData.sortOrder}
            onChange={(e) =>
              onChange({ sortOrder: parseInt(e.target.value, 10) })
            }
            placeholder={t("positionPlaceholder")}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("positionHelp")}
          </p>
        </div>

        {/* Is Active */}
        <div className="flex items-center gap-3">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })}
            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary dark:border-slate-700"
          />
          <label
            htmlFor="isActive"
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {t("isActive")}
          </label>
        </div>
      </div>
    </div>
  );
}
