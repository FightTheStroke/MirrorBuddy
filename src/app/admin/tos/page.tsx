"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { SummaryStats } from "./components/summary-stats";
import { Filters } from "./components/filters";
import { AcceptancesTable } from "./components/acceptances-table";

interface TosAcceptance {
  id: string;
  userId: string;
  version: string;
  acceptedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    profile: {
      name: string | null;
    } | null;
    googleAccount: {
      email: string;
    } | null;
  };
}

interface ApiResponse {
  acceptances: TosAcceptance[];
  summary: {
    totalAcceptances: number;
    uniqueUsers: number;
    versionCounts: Record<string, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export default function AdminTosPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [versionFilter, setVersionFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState("acceptedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
          sortBy,
          sortOrder,
        });

        if (versionFilter) {
          params.append("version", versionFilter);
        }

        const response = await fetch(`/api/admin/tos?${params}`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("Admin access required");
          }
          throw new Error("Failed to fetch ToS acceptances");
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
    [page, versionFilter, sortBy, sortOrder],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading ToS acceptances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
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
          Refresh
        </Button>
      </div>

      <div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {data && (
          <>
            <SummaryStats
              totalAcceptances={data.summary.totalAcceptances}
              uniqueUsers={data.summary.uniqueUsers}
              versionCounts={data.summary.versionCounts}
            />

            <Filters
              versionFilter={versionFilter}
              setVersionFilter={setVersionFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              versionCounts={data.summary.versionCounts}
              onPageReset={() => setPage(1)}
            />

            <AcceptancesTable
              acceptances={data.acceptances}
              pagination={data.pagination}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
