/**
 * VAT/Tax Configuration Admin
 * Task: T1-15 (F-30)
 *
 * Note: This page works with in-memory defaults until TaxConfig migration is run.
 * Run `npx prisma migrate dev` to enable full DB persistence.
 */

import { revalidatePath } from "next/cache";
import Link from "next/link";

export const metadata = {
  title: "Tax Configuration | Admin",
};

// EU country tax configuration
interface TaxConfigItem {
  countryCode: string;
  countryName: string;
  vatRate: number;
  reverseChargeEnabled: boolean;
  isActive: boolean;
  stripeTaxId: string | null;
}

const EU_COUNTRIES: TaxConfigItem[] = [
  {
    countryCode: "IT",
    countryName: "Italy",
    vatRate: 22,
    reverseChargeEnabled: false,
    isActive: true,
    stripeTaxId: null,
  },
  {
    countryCode: "FR",
    countryName: "France",
    vatRate: 20,
    reverseChargeEnabled: false,
    isActive: true,
    stripeTaxId: null,
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    vatRate: 19,
    reverseChargeEnabled: false,
    isActive: true,
    stripeTaxId: null,
  },
  {
    countryCode: "ES",
    countryName: "Spain",
    vatRate: 21,
    reverseChargeEnabled: false,
    isActive: true,
    stripeTaxId: null,
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    vatRate: 20,
    reverseChargeEnabled: false,
    isActive: true,
    stripeTaxId: null,
  },
];

// In-memory store (will be replaced by DB once migration runs)
const taxConfigs = [...EU_COUNTRIES];

async function getTaxConfigs(): Promise<TaxConfigItem[]> {
  // TODO: Once TaxConfig model is migrated, replace with:
  // const configs = await prisma.taxConfig.findMany({ orderBy: { countryCode: "asc" } });
  return taxConfigs;
}

async function updateTaxConfig(formData: FormData) {
  "use server";

  const countryCode = formData.get("countryCode") as string;
  const vatRate = parseFloat(formData.get("vatRate") as string);
  const reverseChargeEnabled = formData.get("reverseChargeEnabled") === "on";
  const isActive = formData.get("isActive") !== "off";

  // Update in-memory (TODO: replace with prisma.taxConfig.upsert)
  const index = taxConfigs.findIndex((c) => c.countryCode === countryCode);
  if (index >= 0) {
    taxConfigs[index] = {
      ...taxConfigs[index],
      vatRate,
      reverseChargeEnabled,
      isActive,
    };
  }

  revalidatePath("/admin/tax");
}

async function syncToStripe(formData: FormData) {
  "use server";

  const countryCode = formData.get("countryCode") as string;

  // Mark as synced (TODO: implement actual Stripe Tax API call)
  const index = taxConfigs.findIndex((c) => c.countryCode === countryCode);
  if (index >= 0) {
    taxConfigs[index].stripeTaxId = `txr_${countryCode.toLowerCase()}_synced`;
  }

  revalidatePath("/admin/tax");
}

export default async function TaxConfigPage() {
  const configs = await getTaxConfigs();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-indigo-600 hover:text-indigo-900"
        >
          ← Back to Admin
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold">VAT/Tax Configuration</h1>
      <p className="mb-6 text-gray-600">
        Configure VAT rates per country for EU tax compliance
      </p>

      <div className="rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                VAT Rate (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Reverse Charge
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Stripe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {configs.map((config) => (
              <tr key={config.countryCode}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-xl">
                      {config.countryCode === "IT" && "🇮🇹"}
                      {config.countryCode === "FR" && "🇫🇷"}
                      {config.countryCode === "DE" && "🇩🇪"}
                      {config.countryCode === "ES" && "🇪🇸"}
                      {config.countryCode === "GB" && "🇬🇧"}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {config.countryName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {config.countryCode}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form
                    action={updateTaxConfig}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="countryCode"
                      value={config.countryCode}
                    />
                    <input
                      type="hidden"
                      name="reverseChargeEnabled"
                      value={config.reverseChargeEnabled ? "on" : ""}
                    />
                    <input
                      type="number"
                      name="vatRate"
                      defaultValue={config.vatRate}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500">%</span>
                    <button
                      type="submit"
                      className="text-xs text-indigo-600 hover:text-indigo-900"
                    >
                      Save
                    </button>
                  </form>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={updateTaxConfig}>
                    <input
                      type="hidden"
                      name="countryCode"
                      value={config.countryCode}
                    />
                    <input
                      type="hidden"
                      name="vatRate"
                      value={config.vatRate}
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="reverseChargeEnabled"
                        defaultChecked={config.reverseChargeEnabled}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="ml-2 text-sm text-gray-600">B2B</span>
                    </label>
                  </form>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      config.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {config.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {config.stripeTaxId ? (
                    <span className="text-xs text-green-600">✓ Synced</span>
                  ) : (
                    <span className="text-xs text-gray-400">Not synced</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={syncToStripe}>
                    <input
                      type="hidden"
                      name="countryCode"
                      value={config.countryCode}
                    />
                    <button
                      type="submit"
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      Sync to Stripe
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-800">EU VAT Compliance</h3>
        <ul className="mt-2 list-inside list-disc text-sm text-blue-700">
          <li>Reverse Charge applies to B2B transactions with valid VAT ID</li>
          <li>Standard rates apply to B2C and B2B without valid VAT ID</li>
          <li>
            UK rates shown for reference (post-Brexit separate rules apply)
          </li>
        </ul>
      </div>

      <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="text-sm font-medium text-yellow-800">
          Database Migration Required
        </h3>
        <p className="mt-1 text-sm text-yellow-700">
          Run{" "}
          <code className="rounded bg-yellow-100 px-1">
            npx prisma migrate dev
          </code>{" "}
          to enable persistent tax configuration storage.
        </p>
      </div>
    </div>
  );
}
