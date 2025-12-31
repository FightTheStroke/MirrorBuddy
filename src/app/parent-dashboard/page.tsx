'use client';

import { useState, useEffect, useCallback } from 'react';
import { ParentDashboard } from '@/components/profile/parent-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileJson,
  FileText,
  Shield,
  UserCheck,
  Trash2,
} from 'lucide-react';
import type { StudentInsights } from '@/types';

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

type PageState = 'loading' | 'no-profile' | 'needs-consent' | 'ready' | 'error' | 'deletion-pending';

export default function ParentDashboardPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [meta, setMeta] = useState<ProfileMeta | null>(null);
  const [_consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

        // Fetch profile
        const result = await fetchProfile();
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
  }, [fetchConsentStatus, fetchProfile]);

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

      // Refetch profile after generation
      await fetchProfile();
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
          const result = await fetchProfile();
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
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                Consenso Richiesto
              </CardTitle>
              <CardDescription>
                Per visualizzare il profilo dello studente e necessario il consenso del genitore.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm">
                <h4 className="font-medium mb-2">Cosa verra visualizzato:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Punti di forza osservati dai Professori</li>
                  <li>Aree dove lo studente puo crescere</li>
                  <li>Strategie di apprendimento personalizzate</li>
                  <li>Stile di apprendimento preferito</li>
                  <li>Statistiche delle sessioni di studio</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
                <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">Privacy e GDPR:</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>I dati sono trattati in conformita al GDPR</li>
                  <li>Puoi esportare i dati in qualsiasi momento</li>
                  <li>Puoi richiedere la cancellazione quando vuoi</li>
                  <li>I dati non vengono condivisi con terze parti</li>
                </ul>
              </div>
              <Button onClick={handleGiveConsent} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Acconsento alla Visualizzazione
              </Button>
            </CardContent>
          </Card>
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Esporta JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Esporta Report
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
                  Aggiorna Profilo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRequestDeletion}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Richiedi Cancellazione
                </Button>
              </div>
            </div>

            {/* Confidence Score Banner */}
            {meta && meta.confidenceScore < 0.5 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Nota:</strong> Il profilo ha una affidabilita del {Math.round(meta.confidenceScore * 100)}%.
                  Piu sessioni di studio con i Professori miglioreranno la precisione delle osservazioni.
                </p>
              </div>
            )}

            {/* Dashboard */}
            {insights && <ParentDashboard insights={insights} />}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-8">
      {renderContent()}
    </div>
  );
}
