"use client";

// Mark as dynamic to avoid static generation issues
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2, RefreshCw, AlertCircle, Settings } from "lucide-react";
import type { StripeAdminResponse } from "@/lib/admin/stripe-admin-types";
import {
  RevenueMetrics,
  ProductsTable,
  SubscriptionsTable,
} from "./components";
import { useTranslations } from "next-intl";

export default function StripeAdminPage() {
  const t = useTranslations("admin");
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
            {t("loadingStripeData")}
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
            {t("stripeRevenueDashboard")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t("monitorProductsSubscriptionsAndRevenueMetrics")}
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
          {t("refresh")}
        </Button>
      </div>

      {/* Not Configured State */}
      {data && !data.configured ? (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Settings className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <CardTitle className="text-2xl">
              {t("stripeIntegrationNotActive")}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t("revenueDataWillAppearHereWhenStripeIsConnected")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                {t("setupSteps")}
              </h3>
              <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex-shrink-0">
                    1
                  </span>
                  <span>
                    {t("add")}{" "}
                    <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-xs">
                      STRIPE_SECRET_KEY
                    </code>{" "}
                    {t("environmentVariable")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex-shrink-0">
                    2
                  </span>
                  <span>
                    {t("update")}{" "}
                    <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-xs">
                      {t("stripeAdminServiceTs")}
                    </code>{" "}
                    {t("withRealApiCalls")}
                  </span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
