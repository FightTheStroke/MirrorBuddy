import { Badge } from "@/components/ui/badge";

interface TierAuditLog {
  id: string;
  tierId: string | null;
  userId: string | null;
  adminId: string;
  action:
    | "TIER_CREATE"
    | "TIER_UPDATE"
    | "TIER_DELETE"
    | "SUBSCRIPTION_CREATE"
    | "SUBSCRIPTION_UPDATE"
    | "SUBSCRIPTION_DELETE"
    | "TIER_CHANGE";
  changes: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
}

interface AuditTableProps {
  logs: TierAuditLog[];
}

const ACTION_COLORS: Record<string, string> = {
  TIER_CREATE:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  TIER_UPDATE:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  TIER_DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  SUBSCRIPTION_CREATE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  SUBSCRIPTION_UPDATE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  SUBSCRIPTION_DELETE:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  TIER_CHANGE:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const ACTION_LABELS: Record<string, string> = {
  TIER_CREATE: "Tier Created",
  TIER_UPDATE: "Tier Updated",
  TIER_DELETE: "Tier Deleted",
  SUBSCRIPTION_CREATE: "Subscription Created",
  SUBSCRIPTION_UPDATE: "Subscription Updated",
  SUBSCRIPTION_DELETE: "Subscription Deleted",
  TIER_CHANGE: "Tier Changed",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChanges(changes: Record<string, unknown>) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return "No changes";
  return entries
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
}

export function AuditTable({ logs }: AuditTableProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Admin ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Changes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge className={ACTION_COLORS[log.action]}>
                      {ACTION_LABELS[log.action]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-xs">
                    {log.adminId.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-xs">
                    {log.userId ? `${log.userId.substring(0, 8)}...` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">
                    {formatChanges(log.changes)}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">
                    {log.notes || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
