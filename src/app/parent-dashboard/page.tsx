'use client';

import { useState, useCallback } from 'react';
import { ParentProfessorChat } from '@/components/profile/parent-professor-chat';
import { useParentDashboard } from './hooks/use-parent-dashboard';
import { exportProfile } from './utils/export-utils';
import { logger } from '@/lib/logger';
import { Header } from './components/header';
import { LoadingView } from './components/loading-view';
import { ErrorView } from './components/error-view';
import { NoProfileView } from './components/no-profile-view';
import { ConsentForm } from './components/consent-form';
import { StudentConsentBanner } from './components/student-consent-banner';
import { DeletionPendingView } from './components/deletion-pending-view';
import { ActionBar } from './components/action-bar';
import { ConfidenceBanner } from './components/confidence-banner';
import { DashboardContent } from './components/dashboard-content';
import { AIDisclaimer } from './components/ai-disclaimer';

const DEMO_USER_ID = 'demo-student-1';

export default function ParentDashboardPage() {
  const {
    pageState,
    insights,
    diaryEntries,
    meta,
    consentStatus,
    error,
    isGenerating,
    isExporting,
    setIsExporting,
    isDiaryLoading,
    handleGenerateProfile,
    handleGiveConsent,
    handleRequestDeletion,
    fetchConsentStatus,
  } = useParentDashboard();

  const [chatMaestro, setChatMaestro] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleTalkToMaestro = useCallback(
    (maestroId: string, maestroName: string) => {
      setChatMaestro({ id: maestroId, name: maestroName });
    },
    []
  );

  const handleExport = useCallback(
    async (format: 'json' | 'pdf') => {
      setIsExporting(true);
      try {
        await exportProfile(format);
      } catch (err) {
        logger.error('Export failed', { error: err, format });
      } finally {
        setIsExporting(false);
      }
    },
    [setIsExporting]
  );

  const handleStudentConsent = useCallback(async () => {
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
    } catch {
      // Ignore error
    }
  }, [fetchConsentStatus]);

  const renderContent = () => {
    switch (pageState) {
      case 'loading':
        return <LoadingView />;

      case 'error':
        return <ErrorView error={error} />;

      case 'no-profile':
        return (
          <NoProfileView
            onGenerate={handleGenerateProfile}
            isGenerating={isGenerating}
            error={error}
          />
        );

      case 'needs-consent':
        return <ConsentForm onConsent={handleGiveConsent} />;

      case 'needs-student-consent':
        return (
          <>
            <StudentConsentBanner onStudentConsent={handleStudentConsent} />
            <div className="max-w-4xl mx-auto">
              <ActionBar
                onExport={handleExport}
                onRefresh={handleGenerateProfile}
                onDelete={handleRequestDeletion}
                isExporting={isExporting}
                isGenerating={isGenerating}
                showDelete={false}
              />
              <DashboardContent
                insights={insights}
                diaryEntries={diaryEntries}
                isDiaryLoading={isDiaryLoading}
                onTalkToMaestro={handleTalkToMaestro}
              />
              <AIDisclaimer />
            </div>
          </>
        );

      case 'deletion-pending':
        return <DeletionPendingView />;

      case 'ready':
        return (
          <>
            <ActionBar
              onExport={handleExport}
              onRefresh={handleGenerateProfile}
              onDelete={handleRequestDeletion}
              isExporting={isExporting}
              isGenerating={isGenerating}
            />
            {meta && <ConfidenceBanner confidenceScore={meta.confidenceScore} />}
            <DashboardContent
              insights={insights}
              diaryEntries={diaryEntries}
              isDiaryLoading={isDiaryLoading}
              onTalkToMaestro={handleTalkToMaestro}
            />
            <AIDisclaimer />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <Header consentStatus={consentStatus} />
      <div className="p-4 sm:p-6 md:p-8 pt-6 sm:pt-8">
        <div className="max-w-4xl mx-auto">{renderContent()}</div>
      </div>
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
