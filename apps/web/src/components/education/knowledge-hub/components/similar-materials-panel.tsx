"use client";

/**
 * Similar Materials Panel
 * Wave 4: UI for similarity search results
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimilarMaterial {
  id: string;
  toolId: string;
  title: string;
  toolType: string;
  similarity: number;
}

interface SimilarMaterialsPanelProps {
  open: boolean;
  toolId?: string;
  onClose: () => void;
  onSelect?: (toolId: string) => void;
  className?: string;
}

export function SimilarMaterialsPanel({
  open,
  toolId,
  onClose,
  onSelect,
  className,
}: SimilarMaterialsPanelProps) {
  const t = useTranslations("education.knowledgeHub");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SimilarMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !toolId) return;

    let cancelled = false;
    async function fetchSimilar() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/materials/similar?toolId=${toolId}&limit=6`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch similar materials");
        }
        const data = await response.json();
        if (!cancelled) {
          setItems(data.similar || []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : t("similarMaterials.errorLoading"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSimilar();

    return () => {
      cancelled = true;
    };
  }, [open, toolId, t]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4",
        className,
      )}
      role="dialog"
      aria-label={t("similarMaterials.ariaLabel")}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t("similarMaterials.title")}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("similarMaterials.closeAriaLabel")}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          {loading && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t("similarMaterials.loading")}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t("similarMaterials.noResults")}
            </div>
          )}

          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect?.(item.toolId)}
              className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.toolType} • {t("similarMaterials.similarity")}{" "}
                    {item.similarity}
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
