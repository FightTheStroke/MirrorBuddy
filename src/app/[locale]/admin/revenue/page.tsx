/**
 * Revenue Dashboard - MRR, ARR, Churn, LTV
 */

import { prisma } from "@/lib/db";

export const metadata = {
  title: "Revenue Dashboard | Admin",
};

async function getRevenueMetrics() {
  const activeSubscriptions = await prisma.userSubscription.count({
    where: { status: "ACTIVE" },
  });

  const proSubscriptions = await prisma.userSubscription.count({
    where: {
      status: "ACTIVE",
      tier: { code: "pro" },
    },
  });

  const mrr = proSubscriptions * 9.99;
  const arr = mrr * 12;

  return {
    activeSubscriptions,
    proSubscriptions,
    mrr,
    arr,
    churnRate: 0,
    avgLTV: 0,
  };
}

export default async function RevenueDashboardPage() {
  const metrics = await getRevenueMetrics();

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold">Revenue Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">MRR</div>
          <div className="mt-2 text-3xl font-bold">
            €{metrics.mrr.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">ARR</div>
          <div className="mt-2 text-3xl font-bold">
            €{metrics.arr.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">
            Active Subscriptions
          </div>
          <div className="mt-2 text-3xl font-bold">
            {metrics.activeSubscriptions}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {metrics.proSubscriptions} Pro
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Churn Rate</div>
          <div className="mt-2 text-3xl font-bold">{metrics.churnRate}%</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Avg LTV</div>
          <div className="mt-2 text-3xl font-bold">
            €{metrics.avgLTV.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
