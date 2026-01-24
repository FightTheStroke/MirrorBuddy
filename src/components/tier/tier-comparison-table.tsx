"use client";

import { Check, X } from "lucide-react";

interface TierData {
  id: string;
  code: string;
  name: string;
  description?: string;
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
  features?: Record<string, boolean | string>;
  availableMaestri?: string[];
  availableCoaches?: string[];
  availableBuddies?: string[];
  availableTools?: string[];
  sortOrder?: number;
}

interface TierComparisonTableProps {
  tiers: TierData[];
  className?: string;
}

/**
 * Feature row definition for comparison table
 */
interface FeatureRow {
  name: string;
  getValue: (tier: TierData) => string | boolean | number;
  isBoolean?: boolean;
}

// Feature keys must match those in tier-seed.ts (camelCase)
const FEATURE_ROWS: FeatureRow[] = [
  {
    name: "Daily Messages",
    getValue: (tier) => tier.chatLimitDaily,
  },
  {
    name: "Voice Minutes",
    getValue: (tier) => tier.voiceMinutesDaily,
  },
  {
    name: "Maestri Available",
    getValue: (tier) => tier.availableMaestri?.length ?? 0,
  },
  {
    name: "Documents Limit",
    getValue: (tier) => tier.docsLimitTotal,
  },
  {
    name: "Voice Chat",
    getValue: (tier) => tier.features?.voice ?? false,
    isBoolean: true,
  },
  {
    name: "Mind Maps",
    getValue: (tier) => tier.features?.mindMaps ?? false,
    isBoolean: true,
  },
  {
    name: "Video Vision",
    getValue: (tier) => tier.features?.videoVision ?? false,
    isBoolean: true,
  },
  {
    name: "Parent Dashboard",
    getValue: (tier) => tier.features?.parentDashboard ?? false,
    isBoolean: true,
  },
  {
    name: "Priority Support",
    getValue: (tier) => tier.features?.prioritySupport ?? false,
    isBoolean: true,
  },
];

/**
 * Feature value cell - renders check/X for boolean, number for numeric
 */
function FeatureCell({
  value,
  isBoolean,
}: {
  value: string | boolean | number;
  isBoolean?: boolean;
}) {
  if (isBoolean) {
    if (value) {
      return (
        <div className="flex justify-center">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    return (
      <div className="flex justify-center">
        <X className="w-5 h-5 text-slate-400 dark:text-slate-600" />
      </div>
    );
  }

  return <div className="text-center font-medium">{value}</div>;
}

/**
 * TierComparisonTable
 *
 * Displays a detailed feature comparison across subscription tiers.
 * Shows numeric limits and boolean feature availability with visual indicators.
 *
 * Features:
 * - Responsive horizontal scroll on mobile
 * - Dark mode support
 * - Alternating row styles
 * - Clear visual hierarchy
 */
export function TierComparisonTable({
  tiers,
  className = "",
}: TierComparisonTableProps) {
  if (!tiers || tiers.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">No tiers available</p>
      </div>
    );
  }

  // Sort tiers by sortOrder
  const sortedTiers = [...tiers].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">
              Feature
            </th>
            {sortedTiers.map((tier) => (
              <th
                key={tier.id}
                className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100"
              >
                <div>
                  <div className="text-sm">{tier.name}</div>
                  {tier.description && (
                    <div className="text-xs font-normal text-slate-600 dark:text-slate-400">
                      {tier.description}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {FEATURE_ROWS.map((feature, idx) => (
            <tr
              key={feature.name}
              className={`border-b border-slate-200 dark:border-slate-700 ${
                idx % 2 === 0
                  ? "bg-white dark:bg-slate-950/30"
                  : "bg-slate-50/50 dark:bg-slate-900/20"
              } hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors`}
            >
              <td className="px-4 py-3 text-left font-medium text-slate-900 dark:text-slate-100">
                {feature.name}
              </td>
              {sortedTiers.map((tier) => (
                <td key={`${tier.id}-${feature.name}`} className="px-4 py-3">
                  <FeatureCell
                    value={feature.getValue(tier)}
                    isBoolean={feature.isBoolean}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TierComparisonTable;
