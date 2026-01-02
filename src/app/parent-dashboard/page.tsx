'use client';

import { useState, useEffect, useCallback } from 'react';
import { ParentDashboard } from '@/components/profile/parent-dashboard';
import { TeacherDiary, type DiaryEntry } from '@/components/profile/teacher-diary';
import { ProgressTimeline } from '@/components/profile/progress-timeline';
import { ParentProfessorChat } from '@/components/profile/parent-professor-chat';
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
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { StudentInsights, ObservationCategory } from '@/types';

// Demo user ID - in production this would come from authentication
const DEMO_USER_ID = 'demo-student-1';

interface ConsentStatus {
  hasProfile: boolean;
  parentConsent: boolean;
  studentConsent: boolean;
  consentDate?: string;
  deletionRequested?: string;
}

interface ProfileMeta {
  confidenceScore: number;
  lastUpdated: string;
  sessionCount: number;
}

interface LearningEntry {
  id: string;
  maestroId: string;
  subject: string;
  category: string;
  insight: string;
  confidence: number;
  occurrences: number;
  createdAt: string;
  lastSeen: string;
}

type PageState = 'loading' | 'no-profile' | 'needs-consent' | 'needs-student-consent' | 'ready' | 'error' | 'deletion-pending';

export default function ParentDashboardPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [meta, setMeta] = useState<ProfileMeta | null>(null);
  const [_consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diary' | 'profile' | 'progress'>('diary');

  // Chat with Maestro state (Issue #63)
  const [chatMaestro, setChatMaestro] = useState<{ id: string; name: string } | null>(null);

  // Handler for "Parla con Professore" button
  const handleTalkToMaestro = useCallback((maestroId: string, maestroName: string) => {
    setChatMaestro({ id: maestroId, name: maestroName });
  }, []);

  // Fetch consent status
  const fetchConsentStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile/consent?userId=${DEMO_USER_ID}`);
      const data = await response.json();
      if (data.success) {
        setConsentStatus(data.data);
        return data.data as ConsentStatus;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Fetch learning entries for diary
  const fetchDiaryEntries = useCallback(async () => {
    setIsDiaryLoading(true);
    try {
      const response = await fetch(`/api/learnings?userId=${DEMO_USER_ID}`);
      const data = await response.json();

      if (response.ok && data.learnings) {
        // Convert to DiaryEntry format
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

  // Helper to get Maestro display name
  const getMaestroDisplayName = (maestroId: string | null): string => {
    if (!maestroId) return 'Professore';
    const names: Record<string, string> = {
      leonardo: 'Leonardo',
      galileo: 'Galileo',
      curie: 'Marie Curie',
      cicerone: 'Cicerone',
      lovelace: 'Ada Lovelace',
      smith: 'Adam Smith',
      shakespeare: 'Shakespeare',
      humboldt: 'Humboldt',
      erodoto: 'Erodoto',
      manzoni: 'Manzoni',
      euclide: 'Euclide',
      mozart: 'Mozart',
      socrate: 'Socrate',
      ippocrate: 'Ippocrate',
      feynman: 'Feynman',
      darwin: 'Darwin',
      chris: 'Chris',
    };
    return names[maestroId.toLowerCase()] || maestroId;
  };

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile?userId=${DEMO_USER_ID}`);
      const data = await response.json();

      if (response.ok && data.success) {
        // Convert date strings to Date objects
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

      if (response.status === 403 && data.requiresConsent) {
        return 'needs-consent';
      }

      if (response.status === 404) {
        return 'no-profile';
      }

      throw new Error(data.error || 'Failed to fetch profile');
    } catch (err) {
      throw err;
    }
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setPageState('loading');
      setError(null);

      try {
        // First check consent status
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

        // Parent consented but student hasn't
        if (consent?.parentConsent && !consent?.studentConsent) {
          setPageState('needs-student-consent');
          // Still load data - parent can view but with reminder
        }

        // Fetch profile and diary entries in parallel
        const [result] = await Promise.all([
          fetchProfile(),
          fetchDiaryEntries(),
        ]);

        if (result === 'needs-consent') {
          setPageState('needs-consent');
        } else if (result === 'no-profile') {
          setPageState('no-profile');
        } else {
          setPageState('ready');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPageState('error');
      }
    };

    load();
  }, [fetchConsentStatus, fetchProfile, fetchDiaryEntries]);

  // Generate profile from learning data
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

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate profile');
      }

      // Refetch profile and diary after generation
      await Promise.all([fetchProfile(), fetchDiaryEntries()]);
      setPageState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate profile');
    } finally {
      setIsGenerating(false);
    }
  };

  // Record consent
  const handleGiveConsent = async () => {
    try {
      const response = await fetch('/api/profile/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          parentConsent: true,
          studentConsent: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Refetch everything
        const consent = await fetchConsentStatus();
        if (consent?.parentConsent) {
          const [result] = await Promise.all([
            fetchProfile(),
            fetchDiaryEntries(),
          ]);
          if (result === true) {
            setPageState('ready');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record consent');
    }
  };

  // Export profile
  const handleExport = async (format: 'json' | 'pdf') => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/profile/export?userId=${DEMO_USER_ID}&format=${format}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create blob and download
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

  // Request deletion
  const handleRequestDeletion = async () => {
    if (!confirm('Sei sicuro di voler richiedere la cancellazione dei dati? Questa operazione non puo essere annullata.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/profile/consent?userId=${DEMO_USER_ID}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        setPageState('deletion-pending');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request deletion');
    }
  };

  // Render based on page state
  const renderContent = () => {
    switch (pageState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-slate-600 dark:text-slate-400">Caricamento profilo...</p>
          </div>
        );

      case 'error':
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
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
            </CardContent>
          </Card>
        );

      case 'no-profile':
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                Nessun Profilo Disponibile
              </CardTitle>
              <CardDescription>
                Per creare il profilo dello studente, e necessario prima interagire con i Professori durante le sessioni di studio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Il profilo viene generato automaticamente analizzando le conversazioni con i Professori,
                identificando punti di forza, aree di crescita e suggerendo strategie personalizzate.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleGenerateProfile} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generazione...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Genera Profilo
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </CardContent>
          </Card>
        );

      case 'needs-consent':
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4 border border-indigo-200 dark:border-indigo-800">
                <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">Consenso per il Dashboard Genitori</CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2">
                Per visualizzare le osservazioni dei Professori su tuo/a figlio/a, abbiamo bisogno del tuo consenso esplicito.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Why we collect this data */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Perche raccogliamo questi dati?
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  Durante le conversazioni con i Professori virtuali, il sistema osserva come tuo/a figlio/a
                  apprende e interagisce. Queste osservazioni ci permettono di costruire un profilo educativo
                  che ti aiuta a <strong>supportare meglio il suo percorso di apprendimento a casa</strong>.
                </p>
              </div>

              {/* What you will see */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Cosa potrai vedere:
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span className="text-slate-600 dark:text-slate-400">Punti di forza osservati dai Professori</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span className="text-slate-600 dark:text-slate-400">Aree dove puo crescere con supporto</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span className="text-slate-600 dark:text-slate-400">Strategie personalizzate per studiare a casa</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span className="text-slate-600 dark:text-slate-400">Stile di apprendimento preferito</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span className="text-slate-600 dark:text-slate-400">Diario con osservazioni cronologiche</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span className="text-slate-600 dark:text-slate-400">Suggerimenti pratici per ogni materia</span>
                  </div>
                </div>
              </div>

              {/* Benefits for parents */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-100 dark:border-amber-800">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Come ti aiuta questo strumento:
                </h4>
                <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Capisci meglio come tuo/a figlio/a affronta lo studio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Ricevi suggerimenti concreti su come supportarlo/a a casa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Segui i progressi nel tempo con osservazioni datate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">4.</span>
                    <span>Scopri i suoi punti di forza per valorizzarli</span>
                  </li>
                </ul>
              </div>

              {/* GDPR and Privacy */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy e i tuoi diritti (GDPR):
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">&#128274;</span>
                    <span>Dati trattati in conformita al GDPR</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">&#128190;</span>
                    <span>Esporta i dati in qualsiasi momento</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">&#128465;</span>
                    <span>Richiedi la cancellazione quando vuoi</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">&#128683;</span>
                    <span>Nessuna condivisione con terze parti</span>
                  </div>
                </div>
              </div>

              {/* AI Disclaimer */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong className="text-slate-700 dark:text-slate-300">Nota importante:</strong> Tutte le osservazioni e i suggerimenti
                  sono generati da un sistema di Intelligenza Artificiale. L&apos;AI puo commettere errori e le osservazioni
                  non sostituiscono la valutazione di insegnanti o professionisti qualificati. Usa queste informazioni
                  come spunto di riflessione, non come diagnosi o valutazione definitiva.
                </p>
              </div>

              {/* Consent button */}
              <div className="pt-2">
                <Button onClick={handleGiveConsent} className="w-full py-5 sm:py-6 text-base sm:text-lg bg-accent-themed hover:bg-accent-themed/90 shadow-lg">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Acconsento alla Visualizzazione del Profilo
                </Button>
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
                  Cliccando, confermi di essere il genitore/tutore legale e di acconsentire al trattamento dei dati educativi.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'needs-student-consent':
        return (
          <>
            {/* Student consent reminder banner */}
            <div className="max-w-4xl mx-auto mb-6">
              <Card className="border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-800/50">
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                        Consenso dello studente mancante
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Per una maggiore trasparenza, chiedi a tuo/a figlio/a di confermare che e d&apos;accordo
                        con la visualizzazione del suo profilo di apprendimento. Puoi comunque visualizzare i dati.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300"
                      onClick={async () => {
                        // Record only student consent (parent already consented)
                        try {
                          await fetch('/api/profile/consent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: DEMO_USER_ID,
                              studentConsent: true,
                            }),
                          });
                          await fetchConsentStatus();
                          setPageState('ready');
                        } catch {
                          // Ignore error
                        }
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Studente Acconsente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Still show the content */}
            <div className="max-w-4xl mx-auto">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    className="justify-center sm:justify-start"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Esporta JSON</span>
                    <span className="sm:hidden">JSON</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                    className="justify-center sm:justify-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Esporta Report</span>
                    <span className="sm:hidden">Report</span>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateProfile}
                  disabled={isGenerating}
                  className="justify-center sm:justify-start"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Aggiorna Profilo
                </Button>
              </div>

              {/* Tabbed Content */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'diary' | 'profile' | 'progress')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
                  <TabsTrigger value="diary" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Diario</span>
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
                    <User className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Profilo</span>
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Progressi</span>
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
                  <ProgressTimeline
                    entries={diaryEntries}
                    studentName={insights?.studentName || 'lo studente'}
                  />
                </TabsContent>
              </Tabs>

              {/* AI Disclaimer Footer */}
              <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-300">Disclaimer AI:</strong> Tutte le osservazioni,
                      i profili e i suggerimenti presenti in questa pagina sono generati automaticamente da un sistema
                      di Intelligenza Artificiale. L&apos;AI puo commettere errori e le informazioni fornite non sostituiscono
                      la valutazione di insegnanti, psicologi o altri professionisti qualificati. Usa queste informazioni
                      come spunto di riflessione e dialogo, non come diagnosi o valutazione definitiva delle capacita
                      di tuo/a figlio/a.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case 'deletion-pending':
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Trash2 className="h-5 w-5" />
                Cancellazione Richiesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400">
                La richiesta di cancellazione e stata registrata.
                I dati verranno eliminati entro 30 giorni, come previsto dal GDPR.
              </p>
            </CardContent>
          </Card>
        );

      case 'ready':
        return (
          <>
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  className="justify-center sm:justify-start"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Esporta JSON</span>
                  <span className="sm:hidden">JSON</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="justify-center sm:justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Esporta Report</span>
                  <span className="sm:hidden">Report</span>
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateProfile}
                  disabled={isGenerating}
                  className="justify-center sm:justify-start"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Aggiorna Profilo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRequestDeletion}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 justify-center sm:justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Richiedi Cancellazione</span>
                  <span className="sm:hidden">Cancella</span>
                </Button>
              </div>
            </div>

            {/* Confidence Score Banner */}
            {meta && meta.confidenceScore < 0.5 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4 mb-6">
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                  <strong>Nota:</strong> Il profilo ha una affidabilita del {Math.round(meta.confidenceScore * 100)}%.
                  Piu sessioni di studio con i Professori miglioreranno la precisione delle osservazioni.
                </p>
              </div>
            )}

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'diary' | 'profile' | 'progress')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
                <TabsTrigger value="diary" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Diario</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Profilo</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Progressi</span>
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
                <ProgressTimeline
                  entries={diaryEntries}
                  studentName={insights?.studentName || 'lo studente'}
                />
              </TabsContent>
            </Tabs>

            {/* AI Disclaimer Footer */}
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 mt-0.5">
                  <AlertCircle className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong className="text-slate-700 dark:text-slate-300">Disclaimer AI:</strong> Tutte le osservazioni,
                    i profili e i suggerimenti presenti in questa pagina sono generati automaticamente da un sistema
                    di Intelligenza Artificiale. L&apos;AI puo commettere errori e le informazioni fornite non sostituiscono
                    la valutazione di insegnanti, psicologi o altri professionisti qualificati. Usa queste informazioni
                    come spunto di riflessione e dialogo, non come diagnosi o valutazione definitiva delle capacita
                    di tuo/a figlio/a.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header with back navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Torna all&apos;app</span>
              <span className="sm:hidden">Indietro</span>
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
              Dashboard Genitori
            </h1>
          </div>
          {/* Consent Status Indicator - Task 0.5.4 */}
          {_consentStatus && (
            <div className="flex items-center gap-2 shrink-0">
              {_consentStatus.parentConsent && _consentStatus.studentConsent ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                  <Shield className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300 hidden sm:inline">
                    Consenso attivo
                  </span>
                  <span className="text-xs font-medium text-green-700 dark:text-green-300 sm:hidden">
                    Attivo
                  </span>
                </div>
              ) : _consentStatus.parentConsent ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300 hidden sm:inline">
                    Parziale
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <div className="p-4 sm:p-6 md:p-8 pt-6 sm:pt-8">
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </div>

      {/* Parent-Professor Chat Modal (Issue #63) */}
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
