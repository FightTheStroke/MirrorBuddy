"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Clock,
  User,
  Mail,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteRequest {
  id: string;
  email: string;
  name: string;
  motivation: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  trialSessionId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  generatedUsername: string | null;
}

type TabStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<InviteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

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
      const response = await fetch("/api/invites/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch("/api/invites/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tabs: { status: TabStatus; label: string }[] = [
    { status: "PENDING", label: "In attesa" },
    { status: "APPROVED", label: "Approvate" },
    { status: "REJECTED", label: "Rifiutate" },
    { status: "ALL", label: "Tutte" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Richieste Beta
          </h1>
          <Button
            onClick={fetchInvites}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.status
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty state */}
        {!loading && invites.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              Nessuna richiesta {activeTab !== "ALL" && "in questo stato"}
            </p>
          </div>
        )}

        {/* Invite list */}
        <div className="space-y-4">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {invite.name}
                    </span>
                    <StatusBadge status={invite.status} />
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                    <Mail className="w-4 h-4" />
                    <span>{invite.email}</span>
                    <span className="text-slate-400">|</span>
                    <span>{formatDate(invite.createdAt)}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {invite.motivation}
                    </p>
                  </div>

                  {invite.generatedUsername && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                      Username: {invite.generatedUsername}
                    </p>
                  )}

                  {invite.rejectionReason && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Motivo: {invite.rejectionReason}
                    </p>
                  )}
                </div>

                {invite.status === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
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
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reject modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Rifiuta richiesta
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Motivo del rifiuto (opzionale)"
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
    </div>
  );
}

function StatusBadge({ status }: { status: InviteRequest["status"] }) {
  const styles = {
    PENDING:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    APPROVED:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const labels = {
    PENDING: "In attesa",
    APPROVED: "Approvata",
    REJECTED: "Rifiutata",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
