'use client';

import { useState, useEffect, useCallback } from 'react';
import { ParentDashboard } from './parent-dashboard';
import { TeacherDiary, type DiaryEntry } from './teacher-diary';
import { ProgressTimeline } from './progress-timeline';
import { ParentProfessorChat } from './parent-professor-chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw, FileJson, FileText, AlertCircle,
  BookOpen, User, TrendingUp, Users, Accessibility,
} from 'lucide-react';
import { AccessibilityTab } from '@/components/settings/sections';
import type { StudentInsights, ObservationCategory } from '@/types';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import type { ConsentStatus, ProfileMeta, LearningEntry, PageState } from './genitori-view/types';
import { DEMO_USER_ID, MAESTRO_NAMES } from './genitori-view/constants';
import {
  fetchConsentStatus, fetchProfile, generateProfile, giveConsent,
  exportProfile, requestDeletion,
} from './genitori-view/api-handlers';
import {
  LoadingState, ErrorState, NoProfileState, NeedsConsentState, DeletionPendingState,
} from './genitori-view/state-pages';

export function GenitoriView() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [meta, setMeta] = useState<ProfileMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diary' | 'profile' | 'progress' | 'accessibility'>('diary');
  const [chatMaestro, setChatMaestro] = useState<{ id: string; name: string } | null>(null);

  // Switch to parent accessibility context and get parent settings
  const setContext = useAccessibilityStore((state) => state.setContext);
  const parentSettings = useAccessibilityStore((state) => state.parentSettings);
  const updateParentSettings = useAccessibilityStore((state) => state.updateParentSettings);

  useEffect(() => {
    setContext('parent');
    return () => setContext('student');
  }, [setContext]);

  const getMaestroDisplayName = (maestroId: string | null): string => {
    if (!maestroId) return 'Professore';
    return MAESTRO_NAMES[maestroId.toLowerCase()] || maestroId;
  };

  const fetchDiaryEntries = useCallback(async () => {
    setIsDiaryLoading(true);
    try {
      const response = await fetch(`/api/learnings?userId=${DEMO_USER_ID}`);
      const data = await response.json();
      if (response.ok && data.learnings) {
        const entries: DiaryEntry[] = data.learnings.map((l: LearningEntry) => ({
          id: l.id,
          maestroId: l.maestroId || 'unknown',
          maestroName: getMaestroDisplayName(l.maestroId),
          subject: l.subject || '',
          category: l.category as ObservationCategory,
          observation: l.insight,
          isStrength: l.confidence >= 0.7,
          confidence: l.confidence,
          occurrences: l.occurrences,
          createdAt: new Date(l.createdAt),
          lastSeen: new Date(l.lastSeen),
        }));
        setDiaryEntries(entries);
      }
    } catch (err) {
      console.error('Failed to fetch diary entries:', err);
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
      setPageState('loading');
      setError(null);
      try {
        const consent = await fetchConsentStatus();
        if (consent?.deletionRequested) {
          setPageState('deletion-pending');
          return;
        }
        if (!consent?.hasProfile) {
          setPageState('no-profile');
          return;
        }
        if (!consent?.parentConsent) {
          setPageState('needs-consent');
          return;
        }
        const result = await handleFetchProfile();
        await fetchDiaryEntries();
        setPageState(result ? 'ready' : 'error');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPageState('error');
      }
    };
    load();
  }, [handleFetchProfile, fetchDiaryEntries]);

  const handleGenerateProfile = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await generateProfile();
      await handleFetchProfile();
      await fetchDiaryEntries();
      setPageState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate profile');
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
        await fetchDiaryEntries();
        if (result) setPageState('ready');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record consent');
    }
  };

  const handleExportClick = async (format: 'json' | 'pdf') => {
    setIsExporting(true);
    try {
      await exportProfile(format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestDeletionClick = async () => {
    if (!confirm('Sei sicuro di voler richiedere la cancellazione dei dati?')) return;
    try {
      await requestDeletion();
      setPageState('deletion-pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request deletion');
    }
  };

  const handleTalkToMaestro = useCallback((maestroId: string, maestroName: string) => {
    setChatMaestro({ id: maestroId, name: maestroName });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-accent-themed" />
            Dashboard Genitori
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Osservazioni dei Professori e profilo di apprendimento
          </p>
        </div>
      </div>

      {/* Content based on state */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        {pageState === 'loading' && <LoadingState />}
        {pageState === 'error' && <ErrorState error={error} onRetry={() => window.location.reload()} />}
        {pageState === 'no-profile' && (
          <NoProfileState onGenerate={handleGenerateProfile} isGenerating={isGenerating} error={error} />
        )}
        {pageState === 'needs-consent' && <NeedsConsentState onConsent={handleGiveConsentClick} />}
        {pageState === 'deletion-pending' && <DeletionPendingState />}

        {pageState === 'ready' && (
          <>
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportClick('json')} disabled={isExporting}>
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportClick('pdf')} disabled={isExporting}>
                  <FileText className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerateProfile} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Aggiorna
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRequestDeletionClick} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancella
                </Button>
              </div>
            </div>

            {/* Confidence Banner */}
            {meta && meta.confidenceScore < 0.5 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Nota:</strong> Affidabilita {Math.round(meta.confidenceScore * 100)}%. Piu sessioni miglioreranno le osservazioni.
                </p>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'diary' | 'profile' | 'progress' | 'accessibility')}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="diary" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Diario
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profilo
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Progressi
                </TabsTrigger>
                <TabsTrigger value="accessibility" className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4" />
                  Accessibilita
                </TabsTrigger>
              </TabsList>

              <TabsContent value="diary">
                <TeacherDiary
                  entries={diaryEntries}
                  studentName={insights?.studentName || 'lo studente'}
                  isLoading={isDiaryLoading}
                  onTalkToMaestro={handleTalkToMaestro}
                />
              </TabsContent>

              <TabsContent value="profile">
                {insights && <ParentDashboard insights={insights} />}
              </TabsContent>

              <TabsContent value="progress">
                <ProgressTimeline entries={diaryEntries} studentName={insights?.studentName || 'lo studente'} />
              </TabsContent>

              <TabsContent value="accessibility">
                <AccessibilityTab
                  settings={parentSettings}
                  onOpenModal={() => {}}
                  onUpdateSettings={updateParentSettings}
                />
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Nota:</strong> Queste impostazioni si applicano solo alla visualizzazione del Dashboard Genitori.
                    Le impostazioni dello studente rimangono separate.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* AI Disclaimer */}
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Disclaimer AI:</strong> Le osservazioni sono generate da AI e non sostituiscono valutazioni professionali.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chat Modal */}
      {chatMaestro && (
        <ParentProfessorChat
          maestroId={chatMaestro.id}
          maestroName={chatMaestro.name}
          studentId={DEMO_USER_ID}
          studentName={insights?.studentName || 'lo studente'}
          onClose={() => setChatMaestro(null)}
        />
      )}
    </div>
  );
}
