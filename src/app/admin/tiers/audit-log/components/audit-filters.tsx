"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface AuditFiltersProps {
  actionFilter: string;
  setActionFilter: (value: string) => void;
  userSearch: string;
  setUserSearch: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  onPageReset: () => void;
}

export function AuditFilters({
  actionFilter,
  setActionFilter,
  userSearch,
  setUserSearch,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onPageReset,
}: AuditFiltersProps) {
  const t = useTranslations("admin");
  const hasFilters = actionFilter || userSearch || startDate || endDate;

  const handleActionChange = (value: string) => {
    setActionFilter(value);
    onPageReset();
  };

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
    onPageReset();
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    onPageReset();
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    onPageReset();
  };

  const clearFilters = () => {
    setActionFilter("");
    setUserSearch("");
    setStartDate("");
    setEndDate("");
    onPageReset();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="audit-action-filter"
            className="block text-sm font-medium mb-2"
          >
            {t("actionType")}
          </label>
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger id="audit-action-filter">
              <SelectValue placeholder={t("allActions1")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("allActions")}</SelectItem>
              <SelectItem value="TIER_CREATE">{t("tierCreated")}</SelectItem>
              <SelectItem value="TIER_UPDATE">{t("tierUpdated")}</SelectItem>
              <SelectItem value="TIER_DELETE">{t("tierDeleted")}</SelectItem>
              <SelectItem value="SUBSCRIPTION_CREATE">
                {t("subscriptionCreated")}
              </SelectItem>
              <SelectItem value="SUBSCRIPTION_UPDATE">
                {t("subscriptionUpdated")}
              </SelectItem>
              <SelectItem value="SUBSCRIPTION_DELETE">
                {t("subscriptionDeleted")}
              </SelectItem>
              <SelectItem value="TIER_CHANGE">{t("tierChanged")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            htmlFor="audit-user-search"
            className="block text-sm font-medium mb-2"
          >
            {t("userId")}
          </label>
          <Input
            type="text"
            id="audit-user-search"
            placeholder={t("searchByUserId")}
            value={userSearch}
            onChange={(e) => handleUserSearchChange(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="audit-start-date"
            className="block text-sm font-medium mb-2"
          >
            {t("startDate")}
          </label>
          <Input
            type="date"
            id="audit-start-date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="audit-end-date"
            className="block text-sm font-medium mb-2"
          >
            {t("endDate")}
          </label>
          <Input
            type="date"
            id="audit-end-date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t("clearFilters")}
          </Button>
        </div>
      )}
    </div>
  );
}
