/**
 * Admin Audit Log Viewer
 * Displays structured audit events with filtering
 * Created for F-11: SOC 2 Type II Readiness
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { csrfFetch } from "@/lib/auth";
import { useTranslations } from "next-intl";

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  targetId: string | null;
  targetType: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogViewerProps {
  initialAction?: string;
}

export function AuditLogViewer({ initialAction }: AuditLogViewerProps) {
  const t = useTranslations("admin");
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState(initialAction || "");
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (actionFilter) params.set("action", actionFilter);

      const response = await csrfFetch(
        `/api/admin/audit-logs?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{t("auditLog")}</h2>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">{t("allActions")}</option>
          <option value="user.create">{t("userCreate")}</option>
          <option value="user.delete">{t("userDelete")}</option>
          <option value="user.role_change">{t("roleChange")}</option>
          <option value="tier.change">{t("tierChange")}</option>
          <option value="sso.config_create">{t("ssoConfig")}</option>
          <option value="sso.directory_sync">{t("directorySync")}</option>
          <option value="auth.login">{t("login")}</option>
          <option value="auth.sso_login">{t("ssoLogin")}</option>
        </select>
        <span className="text-sm text-gray-500">{total} {t("events")}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{t("time")}</th>
              <th className="px-4 py-2 text-left font-medium">{t("action")}</th>
              <th className="px-4 py-2 text-left font-medium">{t("actor")}</th>
              <th className="px-4 py-2 text-left font-medium">{t("target")}</th>
              <th className="px-4 py-2 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  {t("loading")}
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  {t("noAuditEventsFound")}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {entry.actorId.slice(0, 12)}...
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {entry.targetId ? `${entry.targetId.slice(0, 12)}...` : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {entry.ipAddress || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            {t("previous")}
          </button>
          <span className="text-sm text-gray-500">
            {t("page")} {page} {t("of")} {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}
