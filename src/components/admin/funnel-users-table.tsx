/**
 * Funnel Users Table
 * Shows users with stage filtering and drill-down
 * Plan 069 - Conversion Funnel Dashboard
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Search, User, Eye } from "lucide-react";
import { FUNNEL_STAGES } from "@/lib/funnel";

interface FunnelUser {
  id: string;
  type: "visitor" | "user";
  email: string | null;
  currentStage: string;
  stageEnteredAt: string;
  eventsCount: number;
  lastActivity: string;
}

interface FunnelUsersTableProps {
  onSelectUser: (userId: string) => void;
}

const STAGE_BADGE_COLORS: Record<string, string> = {
  VISITOR:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  TRIAL_START:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TRIAL_ENGAGED:
    "bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  LIMIT_HIT:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  BETA_REQUEST:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FIRST_LOGIN:
    "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CHURNED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function FunnelUsersTable({ onSelectUser }: FunnelUsersTableProps) {
  const [users, setUsers] = useState<FunnelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "10",
      });
      if (stageFilter && stageFilter !== "all")
        params.set("stage", stageFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/funnel/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, stageFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search by email or ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={stageFilter}
          onValueChange={(v) => {
            setStageFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {FUNNEL_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden dark:border-gray-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                Events
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">
                Last Activity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm truncate max-w-[150px]">
                          {user.email || user.id.slice(0, 12) + "..."}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        STAGE_BADGE_COLORS[user.currentStage] || "bg-gray-100"
                      }
                    >
                      {user.currentStage}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm">
                    {user.eventsCount}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(user.lastActivity)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectUser(user.id)}
                      aria-label={`View details for ${user.email || user.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
