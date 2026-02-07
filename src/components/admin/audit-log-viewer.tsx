/**
 * Admin Audit Log Viewer
 * Displays structured audit events with filtering
 * Created for F-11: SOC 2 Type II Readiness
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { csrfFetch } from "@/lib/auth";

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
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">All Actions</option>
          <option value="user.create">User Create</option>
          <option value="user.delete">User Delete</option>
          <option value="user.role_change">Role Change</option>
          <option value="tier.change">Tier Change</option>
          <option value="sso.config_create">SSO Config</option>
          <option value="sso.directory_sync">Directory Sync</option>
          <option value="auth.login">Login</option>
          <option value="auth.sso_login">SSO Login</option>
        </select>
        <span className="text-sm text-gray-500">{total} events</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Time</th>
              <th className="px-4 py-2 text-left font-medium">Action</th>
              <th className="px-4 py-2 text-left font-medium">Actor</th>
              <th className="px-4 py-2 text-left font-medium">Target</th>
              <th className="px-4 py-2 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No audit events found
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
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
