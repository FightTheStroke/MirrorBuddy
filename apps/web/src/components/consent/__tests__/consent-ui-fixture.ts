import { vi } from 'vitest';
import { TOS_VERSION } from '@/lib/tos/constants';
import {
  installConsentTransportMock,
  setConsentTestAccount,
} from '@/lib/consent/__tests__/consent-test-transport';

export function installConsentUITransport(eligible = false) {
  localStorage.clear();
  sessionStorage.clear();
  setConsentTestAccount(false);
  installConsentTransportMock(eligible);
  const transport = vi.mocked(fetch).getMockImplementation();
  if (!transport) throw new Error('Missing consent HTTP fixture');
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (input === '/api/version') return Response.json({ version: 'test', environment: 'test' });
    if (input === '/api/tos') {
      return Response.json(
        init?.method === 'POST'
          ? { success: true, version: TOS_VERSION, acceptedAt: new Date().toISOString() }
          : { accepted: false, version: TOS_VERSION },
      );
    }
    if (input === '/api/user/consent' && init?.method !== 'POST') {
      return Response.json({ consent: null, analyticsAllowed: false });
    }
    return transport(input, init);
  });
  return vi.mocked(fetch);
}
