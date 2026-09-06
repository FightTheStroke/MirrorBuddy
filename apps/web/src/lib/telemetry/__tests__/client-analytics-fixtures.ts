import { vi } from 'vitest';
import {
  clearUnifiedConsent,
  saveAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '@/lib/consent/unified-consent-storage';
import { AUTH_COOKIE_CLIENT, clearCSRFToken } from '@/lib/auth';

export function prepareAnalyticsClient() {
  localStorage.clear();
  sessionStorage.clear();
  clearUnifiedConsent();
  clearCSRFToken();
  document.cookie = `${AUTH_COOKIE_CLIENT}=eligible-user; path=/`;
  return vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
    if (url === '/api/session') return Response.json({ csrfToken: 'csrf' });
    if (url === '/api/user/consent') {
      if (typeof init?.body !== 'string') throw new Error('Missing consent payload');
      return Response.json({
        success: true,
        consent: JSON.parse(init.body),
        persisted: true,
        analyticsAllowed: true,
      });
    }
    return Response.json({ success: true });
  });
}
export async function grantAnalyticsClient() {
  await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
}
export function clearAnalyticsClient() {
  clearUnifiedConsent();
  document.cookie = `${AUTH_COOKIE_CLIENT}=; path=/; Max-Age=0`;
  clearCSRFToken();
}
