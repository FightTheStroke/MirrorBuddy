"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface StagingDataCounts {
  users: number;
  conversations: number;
  messages: number;
  flashcardProgress: number;
  quizResults: number;
  materials: number;
  sessionMetrics: number;
  userActivity: number;
  telemetryEvents: number;
  studySessions: number;
  funnelEvents: number;
  total: number;
}

export function PurgeStagingButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [counts, setCounts] = useState<StagingDataCounts | null>(null);
  const { toast } = useToast();

  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const res = await fetch("/api/admin/purge-staging-data");
      if (!res.ok) {
        throw new Error("Failed to fetch counts");
      }
      const data = await res.json();
      setCounts(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch staging data counts",
        variant: "destructive",
      });
    } finally {
      setLoadingCounts(false);
    }
  }, [toast]);

  // Fetch counts when dialog opens
  useEffect(() => {
    if (open && !counts) {
      fetchCounts();
    }
  }, [open, counts, fetchCounts]);

  const handlePurge = async () => {
    setLoading(true);
    try {
      const res = await csrfFetch("/api/admin/purge-staging-data", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to purge staging data");
      }

      const data = await res.json();

      toast({
        title: "Success",
        description: `Deleted ${data.deleted} staging records`,
      });

      // Reset counts and close dialog
      setCounts(null);
      setOpen(false);

      // Refresh the page to update admin dashboard
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to purge data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Purge Staging Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Purge Staging Data
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all records marked as test data
            (isTestData=true). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {loadingCounts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : counts ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Records to be deleted:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Users: {counts.users}</div>
                <div>Conversations: {counts.conversations}</div>
                <div>Messages: {counts.messages}</div>
                <div>Flashcard Progress: {counts.flashcardProgress}</div>
                <div>Quiz Results: {counts.quizResults}</div>
                <div>Materials: {counts.materials}</div>
                <div>Session Metrics: {counts.sessionMetrics}</div>
                <div>User Activity: {counts.userActivity}</div>
                <div>Telemetry Events: {counts.telemetryEvents}</div>
                <div>Study Sessions: {counts.studySessions}</div>
                <div>Funnel Events: {counts.funnelEvents}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700 font-bold text-amber-900 dark:text-amber-100">
                Total: {counts.total} records
              </div>
            </div>

            {counts.total === 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-700 dark:text-green-300">
                  No staging data found. Database is clean.
                </p>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handlePurge}
            disabled={loading || loadingCounts || !counts || counts.total === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Purging...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {counts?.total || 0} Records
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
