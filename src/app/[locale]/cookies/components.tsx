"use client";

import { useTranslations } from "next-intl";

/**
 * Reusable components for Cookie Policy page
 */

export function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `section-${number}`;
  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-baseline gap-3"
      >
        <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">
          {number}.
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export interface CookieInfo {
  name: string;
  purpose: string;
  duration: string;
}

export function CookieTable({ cookies }: { cookies: CookieInfo[] }) {
  const t = useTranslations("legal.cookies");

  return (
    <div className="overflow-x-auto my-4">
      <table
        className="min-w-full border-collapse"
        role="table"
        aria-label={t("table.ariaLabel")}
      >
        <thead>
          <tr className="bg-slate-100 dark:bg-gray-700">
            <th
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
            >
              {t("table.headers.name")}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
            >
              {t("table.headers.purpose")}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
            >
              {t("table.headers.duration")}
            </th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie) => (
            <tr
              key={cookie.name}
              className="hover:bg-slate-50 dark:hover:bg-gray-700/50"
            >
              <td className="px-4 py-3 text-sm font-mono text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600">
                {cookie.name}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600">
                {cookie.purpose}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600">
                {cookie.duration}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
