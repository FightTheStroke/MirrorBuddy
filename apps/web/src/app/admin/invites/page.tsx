"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/admin/export-dropdown";
import { csrfFetch } from "@/lib/auth";
import {
  InvitesTable,
  type InviteRequest,
} from "@/components/admin/invites-table";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { DirectInviteModal } from "@/components/admin/direct-invite-modal";
import { RejectModal } from "@/components/admin/invites/reject-modal";
import { InvitePendingActions } from "@/components/admin/invites/invite-pending-actions";
import { cn } from "@/lib/utils";

type TabStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL" | "DIRECT";

export default function AdminInvitesPage() {
  const t = useTranslations("admin.invites");
  const [invites, setInvites] = useState<InviteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDirectInvite, setShowDirectInvite] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const adminRes = await fetch("/api/admin/session");
      const adminData = adminRes.ok ? await adminRes.json() : null;
      const adminId = adminData?.userId as string | undefined;

      const url =
        activeTab === "ALL"
          ? "/api/invites"
          : activeTab === "DIRECT"
            ? `/api/invites?isDirect=true${adminId ? `&reviewedBy=${adminId}` : ""}`
            : `/api/invites?status=${activeTab}`;

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          setError(t("unauthorized"));
          return;
        }
        throw new Error("Failed to fetch invites");
      }
      const data = await response.json();
      setInvites(data.invites);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadingError"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, t]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await csrfFetch("/api/invites/approve", {
        method: "POST",
        body: JSON.stringify({ requestId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("approvalError"));
      }
      await fetchInvites();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setProcessingId(id);
    try {
      const res = await csrfFetch("/api/invites/reject", {
        method: "POST",
        body: JSON.stringify({ requestId: id, reason: reason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("rejectionError"));
      }
      setRejectingId(null);
      await fetchInvites();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setProcessingId(null);
    }
  };

  const tabs: { status: TabStatus; label: string; count?: number }[] = [
    {
      status: "PENDING",
      label: t("pending"),
      count: invites.filter((i) => i.status === "PENDING").length,
    },
    { status: "APPROVED", label: t("approved") },
    { status: "REJECTED", label: t("rejected") },
    { status: "DIRECT", label: t("direct") },
    { status: "ALL", label: t("all") },
  ];

  const showCheckboxes = activeTab === "PENDING" || activeTab === "ALL";
  const pendingInvites = invites.filter((i) => i.status === "PENDING");

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => setShowDirectInvite(true)}
          size="sm"
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {t("directInvite")}
        </Button>
        <div className="flex gap-2">
          <ExportDropdown
            data={invites}
            columns={[
              { key: "email", label: "Email" },
              { key: "name", label: "Name" },
              { key: "status", label: "Status" },
              { key: "createdAt", label: "Date" },
              { key: "motivation", label: "Motivation" },
            ]}
            filenamePrefix="invites"
          />
          <Button
            onClick={fetchInvites}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 flex-wrap bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === tab.status
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 text-xs opacity-60">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && (
        <InvitesTable
          invites={invites}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          showCheckboxes={showCheckboxes}
        />
      )}

      {!loading && selectedIds.size === 0 && (
        <InvitePendingActions
          invites={pendingInvites}
          processingId={processingId}
          onApprove={handleApprove}
          onReject={(id) => setRejectingId(id)}
        />
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
        onActionComplete={fetchInvites}
      />

      <DirectInviteModal
        isOpen={showDirectInvite}
        onClose={() => setShowDirectInvite(false)}
        onSuccess={fetchInvites}
      />

      {rejectingId && (
        <RejectModal
          inviteId={rejectingId}
          processing={processingId === rejectingId}
          onReject={handleReject}
          onClose={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}
