/**
 * API handlers for GenitoriView
 * Extracted from genitori-view.tsx
 */

import type { ConsentStatus, ProfileMeta, LearningEntry } from './types';
import type { StudentInsights } from '@/types';
import { DEMO_USER_ID } from './constants';

export async function fetchConsentStatus(): Promise<ConsentStatus | null> {
  try {
    const response = await fetch(`/api/profile/consent?userId=${DEMO_USER_ID}`);
    const data = await response.json();
    return data.success ? (data.data as ConsentStatus) : null;
  } catch {
    return null;
  }
}

export async function fetchProfile(): Promise<StudentInsights | null> {
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
      return profileData;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateProfile(): Promise<void> {
  const response = await fetch('/api/profile/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: DEMO_USER_ID, forceRegenerate: true }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to generate profile');
}

export async function giveConsent(): Promise<void> {
  const response = await fetch('/api/profile/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: DEMO_USER_ID, parentConsent: true, studentConsent: true }),
  });
  const data = await response.json();
  if (!data.success) throw new Error('Failed to record consent');
}

export async function exportProfile(format: 'json' | 'pdf'): Promise<void> {
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
}

export async function requestDeletion(): Promise<void> {
  const response = await fetch(`/api/profile/consent?userId=${DEMO_USER_ID}`, { method: 'DELETE' });
  const data = await response.json();
  if (!data.success) throw new Error('Failed to request deletion');
}
