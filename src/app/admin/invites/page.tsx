"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Loader2, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";
import {
  InvitesTable,
  type InviteRequest,
} from "@/components/admin/invites-table";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { DirectInviteModal } from "@/components/admin/direct-invite-modal";
import { cn } from "@/lib/utils";

type TabStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function AdminInvitesPage() {
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
      const url =
        activeTab === "ALL"
          ? "/api/invites"
          : `/api/invites?status=${activeTab}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          setError("Non autorizzato. Effettua il login come admin.");
          return;
        }
        throw new Error("Failed to fetch invites");
      }

      const data = await response.json();
      setInvites(data.invites);
      // Clear selection when data changes
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

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
        throw new Error(data.error || "Errore durante l'approvazione");
      }

      await fetchInvites();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Errore");
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
        throw new Error(data.error || "Errore durante il rifiuto");
      }

      setShowRejectModal(null);
      setRejectReason("");
      await fetchInvites();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Errore");
    } finally {
      setProcessingId(null);
    }
  };

  const tabs: { status: TabStatus; label: string; count?: number }[] = [
    {
      status: "PENDING",
      label: "In attesa",
      count: invites.filter((i) => i.status === "PENDING").length,
    },
    { status: "APPROVED", label: "Approvate" },
    { status: "REJECTED", label: "Rifiutate" },
    { status: "ALL", label: "Tutte" },
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
          Invita direttamente
        </Button>

        <Button
          onClick={fetchInvites}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Aggiorna
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
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
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
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
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
              className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300">
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
                  Approva
                </Button>
                <Button
                  onClick={() => setShowRejectModal(invite.id)}
                  disabled={processingId === invite.id}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                  Rifiuta
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Rifiuta richiesta
            </h3>
            <label
              htmlFor="reject-reason"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Motivo del rifiuto
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Opzionale"
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                variant="outline"
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId === showRejectModal}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {processingId === showRejectModal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Conferma rifiuto"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
