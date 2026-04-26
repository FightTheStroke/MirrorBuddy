"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  adminId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogTableProps {
  logs: AuditLog[];
}

const ACTION_COLORS: Record<string, string> = {
  "user.delete": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "user.restore":
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "user.disable":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "user.enable":
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "invite.approve":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "invite.reject":
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "tier.change":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "character.toggle":
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "character.update":
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "settings.update":
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const t = useTranslations("admin");

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        {t("audit.noLogs")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              {t("audit.colDate")}
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              {t("audit.colAction")}
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              {t("audit.colEntity")}
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 hidden md:table-cell">
              {t("audit.colAdmin")}
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 hidden lg:table-cell">
              {t("audit.colIp")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => (
            <tr
              key={log.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                {formatDate(log.createdAt)}
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    ACTION_COLORS[log.action] ||
                      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                  )}
                >
                  {log.action}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-slate-500">{log.entityType}</span>
                <span className="text-[10px] text-slate-400 ml-1 font-mono">
                  {log.entityId.slice(0, 8)}
                </span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 font-mono">
                {log.adminId.slice(0, 8)}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400 font-mono">
                {log.ipAddress || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
