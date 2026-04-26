/**
 * Types for GenitoriView
 */

export interface ConsentStatus {
  hasProfile: boolean;
  parentConsent: boolean;
  studentConsent: boolean;
  consentDate?: string;
  deletionRequested?: string;
}

export interface ProfileMeta {
  confidenceScore: number;
  lastUpdated: string;
  sessionCount: number;
}

export interface LearningEntry {
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

export type PageState = 'loading' | 'no-profile' | 'needs-consent' | 'ready' | 'error' | 'deletion-pending';
