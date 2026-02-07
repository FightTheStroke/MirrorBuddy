"use client";

import type { RecipientFilters } from "@/lib/email/campaign-service";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterConfiguratorProps {
  filters: RecipientFilters;
  onFilterChange: (key: keyof RecipientFilters, value: unknown) => void;
  onTierToggle: (tier: string) => void;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
}

export function FilterConfigurator({
  filters,
  onFilterChange,
  onTierToggle,
  onBack,
  onNext,
  isLoading,
}: FilterConfiguratorProps) {
  const t = useTranslations("admin.communications.campaigns");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("configureFilters")}</h2>
      <div className="space-y-6">
        {/* Tier checkboxes */}
        <div>
          <label className="block text-sm font-medium mb-2">{t("tiers")}</label>
          <div className="space-y-2">
            {["TRIAL", "BASE", "PRO"].map((tier) => (
              <label key={tier} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.tiers?.includes(tier) || false}
                  onChange={() => onTierToggle(tier)}
                  className="mr-2"
                  aria-label={tier}
                />
                <span>{tier}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Role filter */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-2">
            {t("role")}
          </label>
          <select
            id="role"
            className="w-full border rounded px-3 py-2"
            onChange={(e) =>
              onFilterChange("roles", e.target.value ? [e.target.value] : [])
            }
          >
            <option value="">{t("allRoles")}</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        {/* Include disabled users */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="disabled"
            checked={filters.disabled || false}
            onChange={(e) => onFilterChange("disabled", e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="disabled">{t("includeDisabled")}</label>
        </div>

        {/* Include test data */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="testData"
            checked={filters.isTestData || false}
            onChange={(e) => onFilterChange("isTestData", e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="testData">{t("includeTestData")}</label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t("back")}
        </Button>
        <Button onClick={onNext} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1" />
          )}
          {t("next")}
        </Button>
      </div>
    </div>
  );
}
