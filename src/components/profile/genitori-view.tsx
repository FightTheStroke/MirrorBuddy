"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { ParentDashboard } from "./parent-dashboard";
import { type DiaryEntry } from "./teacher-diary";
import { ProgressTimeline } from "./progress-timeline";
import { ParentProfessorChat } from "./parent-professor-chat";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users,
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
import { useAccessibilityStore } from "@/lib/accessibility";
import type {
  ProfileMeta,
  PageState,
  LearningEntry,
} from "./genitori-view/types";
import {
  DEMO_USER_ID,
  MAESTRO_NAMES,
  EMPTY_ACTIVITY,
} from "./genitori-view/constants";
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
  NeedsConsentState,
  DeletionPendingState,
  WelcomeBanner,
} from "./genitori-view/state-pages";
import {
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
  const tProfile = useTranslations("settings.profile");
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
    const getMaestroDisplayName = (maestroId: string | null): string => {
      if (!maestroId) return tProfile("professorFallback");
      return MAESTRO_NAMES[maestroId.toLowerCase()] || maestroId;
    };

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
  }, [tProfile]);

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
    if (!confirm(tProfile("dataDeletionRequestConfirm"))) return;
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <PageHeader
          icon={Users}
          title="Area Genitori"
          rightContent={
            pageState === "ready" && (
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
            )
          }
        />

        {pageState === "loading" && <LoadingState />}
        {pageState === "error" && (
          <ErrorState error={error} onRetry={() => window.location.reload()} />
        )}
        {pageState === "needs-consent" && (
          <NeedsConsentState onConsent={handleGiveConsentClick} />
        )}
        {pageState === "deletion-pending" && <DeletionPendingState />}

        {(pageState === "ready" || pageState === "no-profile") && (
          <>
            {pageState === "no-profile" && (
              <WelcomeBanner highContrast={highContrast} />
            )}

            {/* Student info + actions bar */}
            <div
              className={cn(
                "flex items-center justify-between gap-4 p-4 rounded-xl border mb-6",
                highContrast
                  ? "bg-black border-yellow-400"
                  : "bg-muted/50 border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    highContrast
                      ? "bg-yellow-400 text-black"
                      : "bg-card shadow-sm",
                  )}
                >
                  <Users
                    className={cn(
                      "w-5 h-5",
                      highContrast ? "text-black" : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      highContrast ? "text-yellow-400" : "text-foreground",
                    )}
                  >
                    {tProfile("studentLabel")} {studentName}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      highContrast
                        ? "text-yellow-200"
                        : "text-muted-foreground",
                    )}
                  >
                    {tProfile("activityOverview")}
                  </p>
                </div>
              </div>
              {pageState === "ready" && (
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
                    {tProfile("updateButton")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRequestDeletionClick}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tProfile("deleteButton")}
                  </Button>
                </div>
              )}
            </div>

            {meta && meta.confidenceScore < 0.5 && (
              <div
                className={cn(
                  "rounded-xl p-4 mb-6 border flex items-center gap-3",
                  highContrast
                    ? "bg-yellow-400/10 border-yellow-400"
                    : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                )}
              >
                <AlertCircle
                  className={cn(
                    "h-5 w-5 shrink-0",
                    highContrast
                      ? "text-yellow-400"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                />
                <p
                  className={cn(
                    "text-sm",
                    highContrast
                      ? "text-yellow-400"
                      : "text-amber-700 dark:text-amber-300",
                  )}
                >
                  <strong>Nota:</strong>{" "}
                  {tProfile("confidenceNote", {
                    score: String(Math.round(meta.confidenceScore * 100)),
                  })}
                </p>
              </div>
            )}

            <DashboardTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              highContrast={highContrast}
            >
              {{
                panoramica: (() => {
                  const data = activity || EMPTY_ACTIVITY;
                  return (
                    <div className="space-y-6">
                      <ActivityOverview
                        stats={data.weeklyStats}
                        highContrast={highContrast}
                      />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RecentSessionsList
                          sessions={data.recentSessions}
                          highContrast={highContrast}
                        />
                        <StreakCalendar
                          streak={data.streak}
                          highContrast={highContrast}
                        />
                      </div>
                    </div>
                  );
                })(),
                progressi: (() => {
                  const data = activity || EMPTY_ACTIVITY;
                  return (
                    <div className="space-y-6">
                      <SubjectsStudied
                        subjects={data.subjectBreakdown}
                        highContrast={highContrast}
                      />
                      <QuizPerformance
                        stats={data.quizStats}
                        highContrast={highContrast}
                      />
                      {insights && <ParentDashboard insights={insights} />}
                      <ProgressTimeline
                        entries={diaryEntries}
                        studentName={studentName}
                      />
                    </div>
                  );
                })(),
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
                        <strong>Nota:</strong> {tProfile("settingsNote")}
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
                  : "bg-muted/50 border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    highContrast ? "text-yellow-400" : "text-muted-foreground",
                  )}
                />
                <p
                  className={cn(
                    "text-xs",
                    highContrast ? "text-yellow-200" : "text-muted-foreground",
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
