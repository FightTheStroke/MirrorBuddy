/**
 * Accessible Table for Chart Data
 * Screen reader accessible representation of chart data
 */

'use client';

import type { ChartRequest } from '@/types';
import { useTranslations } from "next-intl";

interface AccessibleChartTableProps {
  request: ChartRequest;
}

export function AccessibleChartTable({ request }: AccessibleChartTableProps) {
  const t = useTranslations("tools");
  return (
    <table className="sr-only" aria-label={t("dataFor", { title: request.title || t("chartDefault") })}>
      <thead>
        <tr>
          <th>{t("label1")}</th>
          {request.data.datasets.map((dataset) => (
            <th key={dataset.label}>{dataset.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {request.data.labels.map((label, index) => (
          <tr key={label}>
            <td>{label}</td>
            {request.data.datasets.map((dataset) => (
              <td key={`${label}-${dataset.label}`}>{dataset.data[index]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AccessiblePieTable({ request }: AccessibleChartTableProps) {
  const t = useTranslations("tools");
  return (
    <table className="sr-only" aria-label={t("dataFor", { title: request.title || t("chartDefault") })}>
      <thead>
        <tr>
          <th>{t("label")}</th>
          <th>{t("value")}</th>
        </tr>
      </thead>
      <tbody>
        {request.data.labels.map((label, index) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{request.data.datasets[0]?.data[index]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
