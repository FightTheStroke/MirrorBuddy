/**
 * StudyKitViewer Handlers
 * API handlers for StudyKit operations
 */

import toast from "@/components/ui/toast";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth";
import type { StudyKit } from "@/types/study-kit";

interface DeleteHandlerParams {
  studyKit: StudyKit;
  setIsDeleting: (value: boolean) => void;
  onDelete?: () => void;
}

/**
 * Handle StudyKit deletion with confirmation
 */
export async function handleDelete({
  studyKit,
  setIsDeleting,
  onDelete,
}: DeleteHandlerParams): Promise<void> {
  if (!confirm("Sei sicuro di voler eliminare questo Study Kit?")) {
    return;
  }

  setIsDeleting(true);
  try {
    const response = await csrfFetch(`/api/study-kit/${studyKit.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete");
    }

    onDelete?.();
  } catch (error) {
    logger.error("Failed to delete study kit", { error: String(error) });
    alert("Errore durante l'eliminazione");
  } finally {
    setIsDeleting(false);
  }
}

interface PDFHandlerParams {
  studyKit: StudyKit;
}

/**
 * Download accessible PDF with default DSA profile
 */
export async function handleDownloadPDF({
  studyKit,
}: PDFHandlerParams): Promise<void> {
  try {
    const response = await csrfFetch("/api/pdf-generator", {
      method: "POST",
      body: JSON.stringify({
        kitId: studyKit.id,
        profile: "dyslexia",
        format: "A4",
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Export failed" }));
      throw new Error(error.error || "Export failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${studyKit.title.replace(/\s+/g, "-")}_DSA.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("PDF scaricato");
  } catch (error) {
    logger.error("PDF download failed", { error: String(error) });
    toast.error(
      error instanceof Error ? error.message : "Errore durante il download",
    );
  }
}

/**
 * Print accessible PDF directly
 */
export async function handlePrint({
  studyKit,
}: PDFHandlerParams): Promise<void> {
  try {
    const response = await csrfFetch("/api/pdf-generator", {
      method: "POST",
      body: JSON.stringify({
        kitId: studyKit.id,
        profile: "dyslexia",
        format: "A4",
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Print failed" }));
      throw new Error(error.error || "Print failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  } catch (error) {
    logger.error("Print failed", { error: String(error) });
    toast.error(
      error instanceof Error ? error.message : "Errore durante la stampa",
    );
  }
}

interface GeneratePathParams {
  studyKit: StudyKit;
  setIsGeneratingPath: (value: boolean) => void;
  setGeneratedPathId: (value: string | null) => void;
  onGeneratePath?: (pathId: string) => void;
}

/**
 * Generate learning path from StudyKit
 */
export async function handleGeneratePath({
  studyKit,
  setIsGeneratingPath,
  setGeneratedPathId,
  onGeneratePath,
}: GeneratePathParams): Promise<void> {
  setIsGeneratingPath(true);
  try {
    const response = await csrfFetch("/api/learning-path/generate", {
      method: "POST",
      body: JSON.stringify({ studyKitId: studyKit.id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate learning path");
    }

    const data = await response.json();
    const pathId = data.path?.id;

    if (pathId) {
      setGeneratedPathId(pathId);
      onGeneratePath?.(pathId);
    }
  } catch (error) {
    logger.error("Failed to generate learning path", { error: String(error) });
    toast.error("Errore durante la generazione del percorso");
  } finally {
    setIsGeneratingPath(false);
  }
}
