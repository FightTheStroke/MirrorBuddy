"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Loader2, RefreshCw, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";
import {
  InvitesTable,
  type InviteRequest,
} from "@/components/admin/invites-table";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { DirectInviteModal } from "@/components/admin/direct-invite-modal";
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
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminResponse = await fetch("/api/admin/session");
      const adminData = adminResponse.ok ? await adminResponse.json() : null;
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
      // Clear selection when data changes
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
      const response = await csrfFetch("/api/invites/approve", {
        method: "POST",
        body: JSON.stringify({ requestId: id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("approvalError"));
      }

      await fetchInvites();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await csrfFetch("/api/invites/reject", {
        method: "POST",
        body: JSON.stringify({
          requestId: id,
          reason: rejectReason || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("rejectionError"));
      }

      setShowRejectModal(null);
      setRejectReason("");
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

  // Show checkboxes only on PENDING or ALL tab
  const showCheckboxes = activeTab === "PENDING" || activeTab === "ALL";

  // Get pending invites from current view for single actions
  const pendingInvites = invites.filter((i) => i.status === "PENDING");

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => setShowDirectInvite(true)}
          size="sm"
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {t("directInvite")}
        </Button>

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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.status
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  "ml-2 px-1.5 py-0.5 text-xs rounded-full",
                  activeTab === tab.status
                    ? "bg-white/20"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg mb-6">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <InvitesTable
          invites={invites}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          showCheckboxes={showCheckboxes}
        />
      )}

      {/* Single item actions for pending invites */}
      {!loading && pendingInvites.length > 0 && selectedIds.size === 0 && (
        <div className="mt-4 space-y-2">
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
            >
              <span className="text-sm text-foreground">
                {invite.name} ({invite.email})
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(invite.id)}
                  disabled={processingId === invite.id}
                  size="sm"
                  className="gap-1"
                >
                  {processingId === invite.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t("approve")}
                </Button>
                <Button
                  onClick={() => setShowRejectModal(invite.id)}
                  disabled={processingId === invite.id}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                  {t("reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
        onActionComplete={fetchInvites}
      />

      {/* Direct Invite Modal */}
      <DirectInviteModal
        isOpen={showDirectInvite}
        onClose={() => setShowDirectInvite(false)}
        onSuccess={fetchInvites}
      />

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("rejectRequest")}
            </h3>
            <label
              htmlFor="reject-reason"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {t("rejectionReason")}
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("optional")}
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
              rows={3}
            />
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
              <Button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                variant="outline"
                className="flex-1 min-w-20"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId === showRejectModal}
                className="flex-1 min-w-20 bg-red-600 hover:bg-red-700"
              >
                {processingId === showRejectModal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("confirmRejection")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
