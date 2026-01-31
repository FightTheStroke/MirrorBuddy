"use client";

/**
 * StudentSummaryEditor - Main editor for student-written summaries
 * Part of Issue #70: Collaborative summary writing with maieutic method
 */

import {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  Clock,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GuidedSection, SectionOverview } from "./guided-section";
import {
  createEmptyStudentSummary,
  type StudentSummaryData,
  type InlineComment,
} from "@/types/tools";
import { calculateTotalWordCount } from "@/lib/hooks/use-student-summary-sync";

export interface StudentSummaryEditorProps {
  initialData?: StudentSummaryData;
  topic?: string;
  maestroId?: string;
  sessionId?: string;
  onSave?: (data: StudentSummaryData) => Promise<void>;
  onTitleChange?: (title: string) => void;
  onContentChange?: (sectionId: string, content: string) => void;
  readOnly?: boolean;
  className?: string;
}

export interface StudentSummaryEditorHandle {
  getSummaryData: () => StudentSummaryData;
  setTitle: (title: string) => void;
  setSectionContent: (sectionId: string, content: string) => void;
  addComment: (
    sectionId: string,
    comment: Omit<InlineComment, "id" | "createdAt">,
  ) => void;
  removeComment: (sectionId: string, commentId: string) => void;
  resolveComment: (sectionId: string, commentId: string) => void;
  save: () => Promise<void>;
  focusSection: (sectionId: string) => void;
}

export const StudentSummaryEditor = forwardRef<
  StudentSummaryEditorHandle,
  StudentSummaryEditorProps
>(function StudentSummaryEditor(
  {
    initialData,
    topic = "",
    maestroId,
    sessionId,
    onSave,
    onTitleChange,
    onContentChange,
    readOnly = false,
    className,
  },
  ref,
) {
  const t = useTranslations("tools.summary");
  const [summaryData, setSummaryData] = useState<StudentSummaryData>(
    () => initialData || createEmptyStudentSummary(topic, maestroId, sessionId),
  );
  const [activeSectionId, setActiveSectionId] = useState("intro");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const totalWordCount = useMemo(
    () => calculateTotalWordCount(summaryData.sections),
    [summaryData.sections],
  );

  useEffect(() => {
    setSummaryData((prev) => ({
      ...prev,
      wordCount: totalWordCount,
      lastModifiedAt: new Date(),
    }));
  }, [totalWordCount]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setSummaryData((prev) => ({
        ...prev,
        title: newTitle,
        lastModifiedAt: new Date(),
      }));
      onTitleChange?.(newTitle);
    },
    [onTitleChange],
  );

  const handleSectionContentChange = useCallback(
    (sectionId: string, content: string) => {
      setSummaryData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, content } : s,
        ),
        lastModifiedAt: new Date(),
      }));
      onContentChange?.(sectionId, content);
    },
    [onContentChange],
  );

  const handleResolveComment = useCallback(
    (sectionId: string, commentId: string) => {
      setSummaryData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                comments: s.comments.map((c) =>
                  c.id === commentId ? { ...c, resolved: true } : c,
                ),
              }
            : s,
        ),
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(summaryData);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [onSave, summaryData]);

  useImperativeHandle(
    ref,
    () => ({
      getSummaryData: () => summaryData,
      setTitle: (title) =>
        setSummaryData((prev) => ({
          ...prev,
          title,
          lastModifiedAt: new Date(),
        })),
      setSectionContent: handleSectionContentChange,
      addComment: (sectionId, comment) => {
        const newComment: InlineComment = {
          ...comment,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
        setSummaryData((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === sectionId
              ? { ...s, comments: [...s.comments, newComment] }
              : s,
          ),
        }));
      },
      removeComment: (sectionId, commentId) => {
        setSummaryData((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === sectionId
              ? { ...s, comments: s.comments.filter((c) => c.id !== commentId) }
              : s,
          ),
        }));
      },
      resolveComment: handleResolveComment,
      save: handleSave,
      focusSection: setActiveSectionId,
    }),
    [summaryData, handleSectionContentChange, handleResolveComment, handleSave],
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            {readOnly ? (
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {summaryData.title}
              </h2>
            ) : (
              <Input
                value={summaryData.title}
                onChange={handleTitleChange}
                placeholder={t("titlePlaceholder")}
                className="text-xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0"
              />
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {totalWordCount} {totalWordCount === 1 ? t("word") : t("words")}
              </span>
              {lastSaved && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t("saved")}
                </span>
              )}
              {!lastSaved && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {t("unsaved")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden md:flex"
            >
              <Layout className="w-4 h-4 mr-1" />
              {showSidebar ? t("hide") : t("show")}
            </Button>
            {!readOnly && onSave && (
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {t("save")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {showSidebar && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 200 }}
            className="flex-shrink-0 w-full md:w-[200px] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto"
          >
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                {t("structure")}
              </p>
              {summaryData.sections.map((section) => (
                <SectionOverview
                  key={section.id}
                  section={section}
                  isActive={section.id === activeSectionId}
                  onClick={() => setActiveSectionId(section.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {summaryData.sections.map((section, i) => (
              <GuidedSection
                key={section.id}
                section={section}
                onChange={(content) =>
                  handleSectionContentChange(section.id, content)
                }
                onResolveComment={(cid) =>
                  handleResolveComment(section.id, cid)
                }
                readOnly={readOnly}
                shouldFocus={i === 0 && !initialData?.sections[0]?.content}
              />
            ))}
            {totalWordCount > 0 && (
              <div className="text-center py-6 text-sm text-slate-500">
                {totalWordCount < 50
                  ? t("motivational.start")
                  : totalWordCount < 150
                    ? t("motivational.good")
                    : t("motivational.excellent", { count: totalWordCount })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default StudentSummaryEditor;
