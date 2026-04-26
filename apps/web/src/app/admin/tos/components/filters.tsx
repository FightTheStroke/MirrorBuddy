"use client";

/**
 * ToS Filters Component
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface FiltersProps {
  versionFilter: string;
  setVersionFilter: (version: string) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (sortOrder: "asc" | "desc") => void;
  versionCounts: Record<string, number>;
  onPageReset: () => void;
}

export function Filters({
  versionFilter,
  setVersionFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  versionCounts,
  onPageReset,
}: FiltersProps) {
  const t = useTranslations("admin");
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t("filters")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="tos-version-filter"
              className="block text-sm font-medium mb-2"
            >
              {t("version1")}
            </label>
            <select
              id="tos-version-filter"
              className="w-full px-3 py-3 border rounded-lg min-h-11 bg-white dark:bg-slate-950 dark:border-slate-700"
              value={versionFilter}
              onChange={(e) => {
                setVersionFilter(e.target.value);
                onPageReset();
              }}
            >
              <option value="">{t("allVersions")}</option>
              {Object.keys(versionCounts).map((version) => (
                <option key={version} value={version}>
                  v{version}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tos-sort-by"
              className="block text-sm font-medium mb-2"
            >
              {t("sortBy")}
            </label>
            <select
              id="tos-sort-by"
              className="w-full px-3 py-3 border rounded-lg min-h-11 bg-white dark:bg-slate-950 dark:border-slate-700"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="acceptedAt">{t("acceptedAt")}</option>
              <option value="version">{t("version")}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="tos-sort-order"
              className="block text-sm font-medium mb-2"
            >
              {t("order")}
            </label>
            <select
              id="tos-sort-order"
              className="w-full px-3 py-3 border rounded-lg min-h-11 bg-white dark:bg-slate-950 dark:border-slate-700"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            >
              <option value="desc">{t("newestFirst")}</option>
              <option value="asc">{t("oldestFirst")}</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
