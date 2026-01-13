'use client';

/**
 * GenitoriView Component
 * Inline view for Parent Dashboard (no page wrapper)
 * Integrates with main app layout sidebar
 *
 * Uses separate accessibility settings for parent context
 */

import { useState, useEffect, useCallback } from 'react';
import { ParentDashboard } from './parent-dashboard';
import { TeacherDiary, type DiaryEntry } from './teacher-diary';
import { ProgressTimeline } from './progress-timeline';
import { ParentProfessorChat } from './parent-professor-chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileJson,
  FileText,
  Shield,
  UserCheck,
  Trash2,
  BookOpen,
  User,
  TrendingUp,
  Users,
  Accessibility,
} from 'lucide-react';
import { AccessibilityTab } from '@/components/settings/sections';
import type { StudentInsights, ObservationCategory } from '@/types';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import type { ConsentStatus, ProfileMeta, LearningEntry, PageState } from './genitori-view/types';
import { DEMO_USER_ID, MAESTRO_NAMES } from './genitori-view/constants';

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

  const fetchConsentStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile/consent?userId=${DEMO_USER_ID}`);
      const data = await response.json();
      return data.success ? (data.data as ConsentStatus) : null;
    } catch {
      return null;
    }
  }, []);

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

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile?userId=${DEMO_USER_ID}`);
      const data = await response.json();
      if (response.ok && data.success) {
        const profileData = data.data;
        profileData.lastUpdated = new Date(profileData.lastUpdated);
        profileData.strengths = profileData.strengths.map((s: { createdAt: string }) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }));
        profileData.growthAreas = profileData.growthAreas.map((g: { createdAt: string }) => ({
          ...g,
          createdAt: new Date(g.createdAt),
        }));
        setInsights(profileData);
        setMeta(data.meta);
        return true;
      }
      if (response.status === 403 && data.requiresConsent) return 'needs-consent';
      if (response.status === 404) return 'no-profile';
      throw new Error(data.error || 'Failed to fetch profile');
    } catch (err) {
      throw err;
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
        const [result] = await Promise.all([fetchProfile(), fetchDiaryEntries()]);
        if (result === 'needs-consent') setPageState('needs-consent');
        else if (result === 'no-profile') setPageState('no-profile');
        else setPageState('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPageState('error');
      }
    };
    load();
  }, [fetchConsentStatus, fetchProfile, fetchDiaryEntries]);

  const handleGenerateProfile = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/profile/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, forceRegenerate: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to generate profile');
      await Promise.all([fetchProfile(), fetchDiaryEntries()]);
      setPageState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate profile');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGiveConsent = async () => {
    try {
      const response = await fetch('/api/profile/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, parentConsent: true, studentConsent: true }),
      });
      const data = await response.json();
      if (data.success) {
        const consent = await fetchConsentStatus();
        if (consent?.parentConsent) {
          const [result] = await Promise.all([fetchProfile(), fetchDiaryEntries()]);
          if (result === true) setPageState('ready');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record consent');
    }
  };

  const handleExport = async (format: 'json' | 'pdf') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/profile/export?userId=${DEMO_USER_ID}&format=${format}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profilo-${format === 'json' ? 'dati.json' : 'report.html'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!confirm('Sei sicuro di voler richiedere la cancellazione dei dati?')) return;
    try {
      const response = await fetch(`/api/profile/consent?userId=${DEMO_USER_ID}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) setPageState('deletion-pending');
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
        {pageState === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent-themed" />
            <p className="text-slate-600 dark:text-slate-400">Caricamento profilo...</p>
          </div>
        )}

        {pageState === 'error' && (
          <div className="flex flex-col items-center gap-4 text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="font-semibold text-lg">Errore</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Riprova
            </Button>
          </div>
        )}

        {pageState === 'no-profile' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-accent-themed" />
                Nessun Profilo Disponibile
              </CardTitle>
              <CardDescription>
                Per creare il profilo, e necessario prima interagire con i Professori.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGenerateProfile} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Genera Profilo
              </Button>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
          </Card>
        )}

        {pageState === 'needs-consent' && (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                <Shield className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle>Consenso per il Dashboard Genitori</CardTitle>
              <CardDescription>
                Per visualizzare le osservazioni dei Professori, abbiamo bisogno del tuo consenso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGiveConsent} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Acconsento alla Visualizzazione
              </Button>
            </CardContent>
          </Card>
        )}

        {pageState === 'deletion-pending' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Trash2 className="h-5 w-5" />
                Cancellazione Richiesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400">
                I dati verranno eliminati entro 30 giorni, come previsto dal GDPR.
              </p>
            </CardContent>
          </Card>
        )}

        {pageState === 'ready' && (
          <>
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('json')} disabled={isExporting}>
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting}>
                  <FileText className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerateProfile} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Aggiorna
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRequestDeletion} className="text-red-500 hover:text-red-700">
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
