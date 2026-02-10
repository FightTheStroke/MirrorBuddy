"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { AuditFilters } from "./components/audit-filters";
import { AuditTable } from "./components/audit-table";
import { AuditPagination } from "./components/audit-pagination";
import { useTranslations } from "next-intl";

interface TierAuditLog {
  id: string;
  tierId: string | null;
  userId: string | null;
  adminId: string;
  action:
    | "TIER_CREATE"
    | "TIER_UPDATE"
    | "TIER_DELETE"
    | "SUBSCRIPTION_CREATE"
    | "SUBSCRIPTION_UPDATE"
    | "SUBSCRIPTION_DELETE"
    | "TIER_CHANGE";
  changes: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
}

interface ApiResponse {
  logs: TierAuditLog[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function AuditLogPage() {
  const t = useTranslations("admin");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: "50",
        });

        if (actionFilter) params.append("action", actionFilter);
        if (userSearch) params.append("userId", userSearch);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const response = await fetch(`/api/admin/audit-logs?${params}`);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Admin access required");
          }
          throw new Error("Failed to fetch audit logs");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, actionFilter, userSearch, startDate, endDate],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("loadingAuditLogs")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("tierAuditLog")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("completeAuditTrailOfAllTierAndSubscriptionChanges")}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      {/* Filters */}
      <AuditFilters
        actionFilter={actionFilter}
        setActionFilter={setActionFilter}
        userSearch={userSearch}
        setUserSearch={setUserSearch}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onPageReset={() => setPage(1)}
      />

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Table and Pagination */}
      {data && (
        <>
          <AuditTable logs={data.logs} />
          <AuditPagination
            pagination={data.pagination}
            currentPage={page}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
