"use client";

/**
 * Stripe Admin Table Components
 *
 * Table components for products and subscriptions.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  StripeProduct,
  StripeSubscription,
} from "@/lib/admin/stripe-admin-types";
import { formatCurrency, formatDate } from "@/lib/admin/stripe-admin-service";
import { StatusBadge } from "./ui-components";
import { useTranslations } from "next-intl";

/**
 * Products table component
 */
export function ProductsTable({ products }: { products: StripeProduct[] }) {
  const t = useTranslations("admin");
  if (products.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("productsPricing")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-3">{t("product")}</th>
                <th className="text-left py-2 px-3">{t("status1")}</th>
                <th className="text-left py-2 px-3">{t("prices")}</th>
                <th className="text-left py-2 px-3">{t("created1")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-3 px-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge
                      status={product.active ? "active" : "inactive"}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      {product.prices.map((price) => (
                        <div
                          key={price.id}
                          className="text-xs text-slate-600 dark:text-slate-300"
                        >
                          {formatCurrency(price.unitAmount, price.currency)}
                          {price.recurring && ` / ${price.recurring.interval}`}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {formatDate(product.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Subscriptions table component
 */
export function SubscriptionsTable({
  subscriptions,
}: {
  subscriptions: StripeSubscription[];
}) {
  const t = useTranslations("admin");
  if (subscriptions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("activeSubscriptions")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-3">{t("customer")}</th>
                <th className="text-left py-2 px-3">{t("status")}</th>
                <th className="text-left py-2 px-3">{t("period")}</th>
                <th className="text-left py-2 px-3">{t("created")}</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-3 px-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {sub.customerEmail || sub.customerId}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sub.id}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {formatDate(sub.currentPeriodStart)} -{" "}
                    {formatDate(sub.currentPeriodEnd)}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {formatDate(sub.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Re-export RevenueMetrics for convenience
export { RevenueMetrics } from "./ui-components";
