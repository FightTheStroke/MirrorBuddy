/**
 * ToS Acceptances Table with Pagination
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TosAcceptance {
  id: string;
  userId: string;
  version: string;
  acceptedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    profile: {
      name: string | null;
    } | null;
    googleAccount: {
      email: string;
    } | null;
  };
}

interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

interface AcceptancesTableProps {
  acceptances: TosAcceptance[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function AcceptancesTable({
  acceptances,
  pagination,
  onPageChange,
}: AcceptancesTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("it-IT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceptances</CardTitle>
        <CardDescription>
          Page {pagination.page} of {pagination.totalPages} (
          {pagination.totalCount} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                  Version
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                  Accepted At
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                  IP (Last Segment)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {acceptances.map((acceptance) => (
                <tr
                  key={acceptance.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                    {acceptance.user.profile?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {acceptance.user.googleAccount?.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                      v{acceptance.version}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(acceptance.acceptedAt)}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-500">
                    {acceptance.ipAddress || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPageChange(Math.min(pagination.totalPages, pagination.page + 1))
            }
            disabled={pagination.page === pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
