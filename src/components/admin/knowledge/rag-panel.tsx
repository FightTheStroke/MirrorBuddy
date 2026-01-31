"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { toast } from "@/components/ui/toast";

interface EmbeddingStats {
  total: number;
  bySourceType: { sourceType: string; count: number; totalTokens: number }[];
}

export function RagPanel() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/knowledge/embeddings");
      if (res.ok) setStats(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleReindex = async (maestroId: string) => {
    setReindexing(maestroId);
    try {
      const res = await csrfFetch("/api/admin/knowledge/reindex", {
        method: "POST",
        body: JSON.stringify({ maestroId }),
      });
      if (!res.ok) throw new Error("Reindex failed");
      const data = await res.json();
      toast.success(
        "Reindex triggered",
        `Cleared ${data.deletedCount} embeddings for ${maestroId}`,
      );
      await fetchStats();
    } catch {
      toast.error("Reindex failed", "Could not clear embeddings");
    } finally {
      setReindexing(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-indigo-500" />
          RAG Embeddings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : stats ? (
          <>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">
                {stats.total.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">Total Embeddings</p>
            </div>
            <div className="space-y-2">
              {stats.bySourceType.map((s) => (
                <div
                  key={s.sourceType}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-slate-600 dark:text-slate-400">
                    {s.sourceType}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{s.count}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleReindex(s.sourceType)}
                      disabled={reindexing === s.sourceType}
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${reindexing === s.sourceType ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">
            No embedding data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
