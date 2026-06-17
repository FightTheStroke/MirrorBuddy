/**
 * API handlers for GenitoriView
 * Extracted from genitori-view.tsx
 *
 * All handlers require the real authenticated user id (BUG-03). The parent and
 * child share a single account, so the parent dashboard inspects the signed-in
 * user's own data. The /api/profile/consent and /api/profile/generate routes
 * additionally reject any userId that does not match the authenticated session
 * (403), so passing the real id is mandatory — the former hardcoded
 * demo-student-1 made every call fail for real users.
 */

import type { ConsentStatus } from './types';
import type { StudentInsights } from '@/types';
import { csrfFetch } from '@/lib/auth';

export async function fetchConsentStatus(userId: string): Promise<ConsentStatus | null> {
  try {
    const response = await fetch(`/api/profile/consent?userId=${encodeURIComponent(userId)}`);
    const data = await response.json();
    return data.success ? (data.data as ConsentStatus) : null;
  } catch {
    return null;
  }
}

export async function fetchProfile(userId: string): Promise<StudentInsights | null> {
  try {
    const response = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
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

export async function generateProfile(userId: string): Promise<void> {
  const response = await csrfFetch('/api/profile/generate', {
    method: 'POST',
    body: JSON.stringify({ userId, forceRegenerate: true }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to generate profile');
}

export async function giveConsent(userId: string): Promise<void> {
  const response = await csrfFetch('/api/profile/consent', {
    method: 'POST',
    body: JSON.stringify({ userId, parentConsent: true, studentConsent: true }),
  });
  const data = await response.json();
  if (!data.success) throw new Error('Failed to record consent');
}

export async function exportProfile(userId: string, format: 'json' | 'pdf'): Promise<void> {
  const response = await fetch(
    `/api/profile/export?userId=${encodeURIComponent(userId)}&format=${format}`,
  );
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

export async function requestDeletion(userId: string): Promise<void> {
  const response = await csrfFetch(`/api/profile/consent?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!data.success) throw new Error('Failed to request deletion');
}
