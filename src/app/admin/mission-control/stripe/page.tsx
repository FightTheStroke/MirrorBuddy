"use client";

// Mark as dynamic to avoid static generation issues
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import type { StripeAdminResponse } from "@/lib/admin/stripe-admin-types";
import {
  RevenueMetrics,
  ProductsTable,
  SubscriptionsTable,
} from "./components";

export default function StripeAdminPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StripeAdminResponse | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/admin/stripe");

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch Stripe data",
      );
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-600 dark:text-slate-400">
            Loading Stripe data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Stripe Revenue Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitor products, subscriptions, and revenue metrics
          </p>
        </div>
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

      {/* Configuration Warning */}
      {data && !data.configured && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Stripe Not Configured
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              The data below is demo/placeholder data. To enable real Stripe
              integration:
            </p>
            <ol className="text-sm text-amber-700 dark:text-amber-300 list-decimal list-inside space-y-1">
              <li>Install Stripe SDK: npm install stripe</li>
              <li>Add STRIPE_SECRET_KEY to environment variables</li>
              <li>Update stripe-admin-service.ts with real API calls</li>
            </ol>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Revenue Metrics */}
      {data?.revenue && (
        <RevenueMetrics
          mrr={data.revenue.mrr}
          arr={data.revenue.arr}
          activeSubscriptions={data.revenue.activeSubscriptions}
          totalRevenue={data.revenue.totalRevenue}
          currency={data.revenue.currency}
        />
      )}

      {/* Products Table */}
      {data?.products && <ProductsTable products={data.products} />}

      {/* Subscriptions Table */}
      {data?.subscriptions && (
        <SubscriptionsTable subscriptions={data.subscriptions} />
      )}
    </div>
  );
}
