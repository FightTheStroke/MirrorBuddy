/**
 * Admin Tier Management - CRUD for tier plans
 */

import { prisma } from "@/lib/db";
import Link from "next/link";

export const metadata = {
  title: "Tier Management | Admin",
};

async function getTiers() {
  return await prisma.tierDefinition.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export default async function AdminTiersPage() {
  const tiers = await getTiers();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tier Management</h1>
        <Link
          href="/admin/tiers/new"
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Create Tier
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {tiers.map((tier) => (
              <tr key={tier.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {tier.code}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {tier.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {tier.monthlyPriceEur
                    ? `€${Number(tier.monthlyPriceEur).toFixed(2)}`
                    : "Free"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    Active
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  <Link
                    href={`/admin/tiers/${tier.id}/edit`}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/tiers/${tier.id}/features`}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                  >
                    Features
                  </Link>
                  <Link
                    href={`/admin/tiers/${tier.id}/pricing`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Pricing
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
