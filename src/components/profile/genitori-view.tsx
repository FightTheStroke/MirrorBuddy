"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { ParentDashboard } from "./parent-dashboard";
import { type DiaryEntry } from "./teacher-diary";
import { ProgressTimeline } from "./progress-timeline";
import { ParentProfessorChat } from "./parent-professor-chat";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  FileJson,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { AccessibilityTab } from "@/components/settings/sections";
import type {
  StudentInsights,
  ObservationCategory,
  ParentDashboardActivity,
} from "@/types";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import type {
  ProfileMeta,
  PageState,
  LearningEntry,
} from "./genitori-view/types";
import { DEMO_USER_ID, MAESTRO_NAMES } from "./genitori-view/constants";
import {
  fetchConsentStatus,
  fetchProfile,
  generateProfile,
  giveConsent,
  exportProfile,
  requestDeletion,
} from "./genitori-view/api-handlers";
import {
  LoadingState,
  ErrorState,
  NoProfileState,
  NeedsConsentState,
  DeletionPendingState,
} from "./genitori-view/state-pages";
import {
  ParentHeader,
  ActivityOverview,
  RecentSessionsList,
  StreakCalendar,
  SubjectsStudied,
  QuizPerformance,
  FeatureGuide,
  TeacherObservationsSection,
  DashboardTabs,
  type DashboardTab,
} from "./parent-dashboard/index";

export function GenitoriView() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [activity, setActivity] = useState<ParentDashboardActivity | null>(
    null,
  );
  const [meta, _setMeta] = useState<ProfileMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("panoramica");
  const [chatMaestro, setChatMaestro] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const setContext = useAccessibilityStore((state) => state.setContext);
  const parentSettings = useAccessibilityStore((state) => state.parentSettings);
  const updateParentSettings = useAccessibilityStore(
    (state) => state.updateParentSettings,
  );
  const highContrast = parentSettings.highContrast;

  useEffect(() => {
    setContext("parent");
    return () => setContext("student");
  }, [setContext]);

  const getMaestroDisplayName = (maestroId: string | null): string => {
    if (!maestroId) return "Professore";
    return MAESTRO_NAMES[maestroId.toLowerCase()] || maestroId;
  };

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch("/api/parent-dashboard/activity");
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      }
    } catch (err) {
      logger.error("Failed to fetch activity", { error: String(err) });
    }
  }, []);

  const fetchDiaryEntries = useCallback(async () => {
    setIsDiaryLoading(true);
    try {
      const response = await fetch(`/api/learnings?userId=${DEMO_USER_ID}`);
      const data = await response.json();
      if (response.ok && data.learnings) {
        const entries: DiaryEntry[] = data.learnings.map(
          (l: LearningEntry) => ({
            id: l.id,
            maestroId: l.maestroId || "unknown",
            maestroName: getMaestroDisplayName(l.maestroId),
            subject: l.subject || "",
            category: l.category as ObservationCategory,
            observation: l.insight,
            isStrength: l.confidence >= 0.7,
            confidence: l.confidence,
            occurrences: l.occurrences,
            createdAt: new Date(l.createdAt),
            lastSeen: new Date(l.lastSeen),
          }),
        );
        setDiaryEntries(entries);
      }
    } catch (err) {
      logger.error("Failed to fetch diary entries", { error: String(err) });
    } finally {
      setIsDiaryLoading(false);
    }
  }, []);

  const handleFetchProfile = useCallback(async () => {
    try {
      const profileData = await fetchProfile();
      if (profileData) {
        setInsights(profileData);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setPageState("loading");
      setError(null);
      try {
        const consent = await fetchConsentStatus();
        if (consent?.deletionRequested) {
          setPageState("deletion-pending");
          return;
        }
        if (!consent?.hasProfile) {
          setPageState("no-profile");
          return;
        }
        if (!consent?.parentConsent) {
          setPageState("needs-consent");
          return;
        }
        const result = await handleFetchProfile();
        await Promise.all([fetchDiaryEntries(), fetchActivity()]);
        setPageState(result ? "ready" : "error");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setPageState("error");
      }
    };
    load();
  }, [handleFetchProfile, fetchDiaryEntries, fetchActivity]);

  const handleGenerateProfile = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await generateProfile();
      await handleFetchProfile();
      await Promise.all([fetchDiaryEntries(), fetchActivity()]);
      setPageState("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate profile",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGiveConsentClick = async () => {
    try {
      await giveConsent();
      const consent = await fetchConsentStatus();
      if (consent?.parentConsent) {
        const result = await handleFetchProfile();
        await Promise.all([fetchDiaryEntries(), fetchActivity()]);
        if (result) setPageState("ready");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record consent");
    }
  };

  const handleExportClick = async (format: "json" | "pdf") => {
    setIsExporting(true);
    try {
      await exportProfile(format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestDeletionClick = async () => {
    if (!confirm("Sei sicuro di voler richiedere la cancellazione dei dati?"))
      return;
    try {
      await requestDeletion();
      setPageState("deletion-pending");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request deletion",
      );
    }
  };

  const handleTalkToMaestro = useCallback(
    (maestroId: string, maestroName: string) => {
      setChatMaestro({ id: maestroId, name: maestroName });
    },
    [],
  );

  const studentName = insights?.studentName || "lo studente";

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-xl shadow-sm border p-6",
          highContrast
            ? "bg-black border-yellow-400"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
        )}
      >
        {pageState === "loading" && <LoadingState />}
        {pageState === "error" && (
          <ErrorState error={error} onRetry={() => window.location.reload()} />
        )}
        {pageState === "no-profile" && (
          <NoProfileState
            onGenerate={handleGenerateProfile}
            isGenerating={isGenerating}
            error={error}
          />
        )}
        {pageState === "needs-consent" && (
          <NeedsConsentState onConsent={handleGiveConsentClick} />
        )}
        {pageState === "deletion-pending" && <DeletionPendingState />}

        {pageState === "ready" && (
          <>
            <ParentHeader
              studentName={studentName}
              highContrast={highContrast}
              className="mb-6"
            />

            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportClick("json")}
                  disabled={isExporting}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportClick("pdf")}
                  disabled={isExporting}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateProfile}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Aggiorna
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRequestDeletionClick}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancella
                </Button>
              </div>
            </div>

            {meta && meta.confidenceScore < 0.5 && (
              <div
                className={cn(
                  "rounded-lg p-3 mb-6 border",
                  highContrast
                    ? "bg-yellow-400/10 border-yellow-400"
                    : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                )}
              >
                <p
                  className={cn(
                    "text-sm",
                    highContrast
                      ? "text-yellow-400"
                      : "text-amber-700 dark:text-amber-300",
                  )}
                >
                  <strong>Nota:</strong> Affidabilità{" "}
                  {Math.round(meta.confidenceScore * 100)}%. Più sessioni
                  miglioreranno le osservazioni.
                </p>
              </div>
            )}

            <DashboardTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              highContrast={highContrast}
            >
              {{
                panoramica: activity ? (
                  <div className="space-y-6">
                    <ActivityOverview
                      stats={activity.weeklyStats}
                      highContrast={highContrast}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <RecentSessionsList
                        sessions={activity.recentSessions}
                        highContrast={highContrast}
                      />
                      <StreakCalendar
                        streak={activity.streak}
                        highContrast={highContrast}
                      />
                    </div>
                  </div>
                ) : (
                  <LoadingState />
                ),
                progressi: activity ? (
                  <div className="space-y-6">
                    <SubjectsStudied
                      subjects={activity.subjectBreakdown}
                      highContrast={highContrast}
                    />
                    <QuizPerformance
                      stats={activity.quizStats}
                      highContrast={highContrast}
                    />
                    {insights && <ParentDashboard insights={insights} />}
                    <ProgressTimeline
                      entries={diaryEntries}
                      studentName={studentName}
                    />
                  </div>
                ) : (
                  <LoadingState />
                ),
                osservazioni: (
                  <TeacherObservationsSection
                    entries={diaryEntries}
                    studentName={studentName}
                    isLoading={isDiaryLoading}
                    highContrast={highContrast}
                    onTalkToMaestro={handleTalkToMaestro}
                  />
                ),
                guida: <FeatureGuide highContrast={highContrast} />,
                accessibilita: (
                  <div>
                    <AccessibilityTab
                      settings={parentSettings}
                      onOpenModal={() => {}}
                      onUpdateSettings={updateParentSettings}
                    />
                    <div
                      className={cn(
                        "mt-4 p-4 rounded-lg border",
                        highContrast
                          ? "bg-yellow-400/10 border-yellow-400"
                          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm",
                          highContrast
                            ? "text-yellow-400"
                            : "text-blue-700 dark:text-blue-300",
                        )}
                      >
                        <strong>Nota:</strong> Queste impostazioni si applicano
                        solo alla visualizzazione del Dashboard Genitori.
                      </p>
                    </div>
                  </div>
                ),
              }}
            </DashboardTabs>

            <div
              className={cn(
                "mt-6 p-4 rounded-xl border",
                highContrast
                  ? "bg-black border-yellow-400"
                  : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
              )}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={cn(
                    "h-4 w-4 mt-0.5",
                    highContrast ? "text-yellow-400" : "text-slate-500",
                  )}
                />
                <p
                  className={cn(
                    "text-xs",
                    highContrast
                      ? "text-yellow-200"
                      : "text-slate-600 dark:text-slate-400",
                  )}
                >
                  <strong>Disclaimer AI:</strong> Le osservazioni sono generate
                  da AI e non sostituiscono valutazioni professionali.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {chatMaestro && (
        <ParentProfessorChat
          maestroId={chatMaestro.id}
          maestroName={chatMaestro.name}
          studentId={DEMO_USER_ID}
          studentName={studentName}
          onClose={() => setChatMaestro(null)}
        />
      )}
    </div>
  );
}
