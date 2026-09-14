import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  getUnifiedConsent,
  hasAnalyticsConsent,
  initializeConsent,
  saveAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '../unified-consent-storage';
import { resetConsentSnapshot } from '../consent-store';
import { installConsentTransportMock, setConsentTestAccount } from './consent-test-transport';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setConsentTestAccount(true);
  installConsentTransportMock(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  setConsentTestAccount();
  resetConsentSnapshot();
});

it('does not overwrite a newer explicit acknowledged choice with an obsolete initialization response', async () => {
  const transport = vi.mocked(fetch).getMockImplementation();
  if (!transport) throw new Error('Missing HTTP fixture');
  let release: (response: Response) => void = () => {
    throw new Error('Not registered');
  };
  let requested: () => void = () => {
    throw new Error('Not registered');
  };
  const ready = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const response = new Promise<Response>((resolve) => {
    release = resolve;
  });
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (input === '/api/tos') return Response.json({ accepted: false, version: '1.0' });
    if (input === '/api/user/consent' && init?.method === 'GET') {
      requested();
      return response;
    }
    return transport(input, init);
  });
  const loading = initializeConsent();
  await ready;
  const choice = saveAnalyticsConsent(true);
  await syncUnifiedConsentToServer(choice);
  expect(hasAnalyticsConsent()).toBe(true);
  release(
    Response.json({
      consent: {
        version: '1.0',
        acceptedAt: '2026-09-01T00:00:00.000Z',
        essential: true,
        analytics: false,
        marketing: false,
      },
      analyticsAllowed: false,
    }),
  );
  await loading;
  expect(getUnifiedConsent()?.cookies).toEqual(choice.cookies);
  expect(getUnifiedConsent()?.pending).toBeUndefined();
  expect(hasAnalyticsConsent()).toBe(true);
});
