/**
 * @file use-parent-dashboard.ts
 * @brief Custom hook for parent dashboard state management
 */

import { useState, useEffect, useCallback } from 'react';
import type { StudentInsights } from '@/types';
import type { DiaryEntry } from '@/components/profile/teacher-diary';
import { logger } from '@/lib/logger';

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

type PageState =
  | 'loading'
  | 'no-profile'
  | 'needs-consent'
  | 'needs-student-consent'
  | 'ready'
  | 'error'
  | 'deletion-pending';

export function useParentDashboard() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [meta, setMeta] = useState<ProfileMeta | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);

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

  const fetchDiaryEntries = useCallback(async () => {
    setIsDiaryLoading(true);
    try {
      const response = await fetch(`/api/learnings?userId=${DEMO_USER_ID}`);
      const data = await response.json();
      if (data.success) {
        setDiaryEntries(data.entries || []);
      }
    } catch (err) {
      logger.error('Failed to fetch diary entries', undefined, err);
    } finally {
      setIsDiaryLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile?userId=${DEMO_USER_ID}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return 'no-profile';
        }
        if (response.status === 403) {
          return 'needs-consent';
        }
        throw new Error(data.message || 'Failed to fetch profile');
      }

      if (data.success && data.data) {
        setInsights(data.data.insights);
        setMeta(data.data.meta);
        return true;
      }
      return 'no-profile';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return 'error';
    }
  }, []);

  useEffect(() => {
    const load = async () => {
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

        if (consent?.parentConsent && !consent?.studentConsent) {
          setPageState('needs-student-consent');
        }

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
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          parentConsent: true,
          studentConsent: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
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

  const handleRequestDeletion = async () => {
    if (
      !confirm(
        'Sei sicuro di voler richiedere la cancellazione dei dati? Questa operazione non puo essere annullata.'
      )
    ) {
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
      setError(
        err instanceof Error ? err.message : 'Failed to request deletion'
      );
    }
  };

  return {
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
  };
}

