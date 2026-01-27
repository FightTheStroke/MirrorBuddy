"use client";

/**
 * Summary Tool Component
 *
 * Wrapper component for displaying summaries in the tool panel.
 * Handles both view mode and edit mode with conversion actions.
 *
 * Part of Issue #70: Real-time summary tool
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Download, Brain, Layers, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryRenderer } from "./summary-renderer";
import { SummaryEditor } from "./summary-editor";
import { cn } from "@/lib/utils";
import type { SummaryData, SummarySection } from "@/types/tools";

// ============================================================================
// TYPES
// ============================================================================

export interface SummaryToolProps {
  /** Summary data */
  data: SummaryData;
  /** Callback when data changes (edit mode) */
  onDataChange?: (data: SummaryData) => void;
  /** Callback for PDF export */
  onExportPdf?: (data: SummaryData) => void;
  /** Callback for converting to mindmap */
  onConvertToMindmap?: (data: SummaryData) => void;
  /** Callback for generating flashcards */
  onGenerateFlashcards?: (data: SummaryData) => void;
  /** Callback when saving */
  onSave?: (data: SummaryData) => void;
  /** Whether editing is allowed */
  allowEdit?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SummaryTool({
  data,
  onDataChange,
  onExportPdf,
  onConvertToMindmap,
  onGenerateFlashcards,
  onSave,
  allowEdit = true,
  className,
}: SummaryToolProps) {
  const t = useTranslations("tools.summary");
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<SummaryData>(data);

  // Handle title change
  const handleTitleChange = useCallback((title: string) => {
    setEditedData((prev) => ({ ...prev, topic: title }));
  }, []);

  // Handle sections change
  const handleSectionsChange = useCallback((sections: SummarySection[]) => {
    setEditedData((prev) => ({ ...prev, sections }));
  }, []);

  // Save changes
  const handleSave = useCallback(() => {
    onDataChange?.(editedData);
    onSave?.(editedData);
    setIsEditing(false);
  }, [editedData, onDataChange, onSave]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditedData(data);
    setIsEditing(false);
  }, [data]);

  // Export to PDF
  const handleExportPdf = useCallback(() => {
    onExportPdf?.(isEditing ? editedData : data);
  }, [isEditing, editedData, data, onExportPdf]);

  // Convert to mindmap
  const handleConvertToMindmap = useCallback(() => {
    onConvertToMindmap?.(isEditing ? editedData : data);
  }, [isEditing, editedData, data, onConvertToMindmap]);

  // Generate flashcards
  const handleGenerateFlashcards = useCallback(() => {
    onGenerateFlashcards?.(isEditing ? editedData : data);
  }, [isEditing, editedData, data, onGenerateFlashcards]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <div className="p-4">
            <SummaryEditor
              title={editedData.topic}
              sections={editedData.sections}
              onTitleChange={handleTitleChange}
              onSectionsChange={handleSectionsChange}
            />
          </div>
        ) : (
          <SummaryRenderer
            title={data.topic}
            sections={data.sections}
            length={data.length}
          />
        )}
      </div>

      {/* Actions Bar */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {t("save")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  {t("cancel")}
                </Button>
              </>
            ) : (
              allowEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {t("edit")}
                </Button>
              )
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {onExportPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="gap-2"
                title={t("exportPdf")}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            )}

            {onConvertToMindmap && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvertToMindmap}
                className="gap-2"
                title={t("convertToMindmap")}
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Mappa</span>
              </Button>
            )}

            {onGenerateFlashcards && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateFlashcards}
                className="gap-2"
                title={t("generateFlashcards")}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Flashcard</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
