import type { Page, Request } from '@playwright/test';

export async function observeTermsRequests(page: Page) {
  const requests: Request[] = [];
  const initiators: Array<{
    type: string;
    startedAt: number;
    frames: Array<{ functionName: string; url: string; lineNumber: number; columnNumber: number }>;
  }> = [];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', (event) => {
    if (new URL(event.request.url).pathname !== '/api/tos') return;
    initiators.push({
      type: event.initiator.type,
      startedAt: event.wallTime * 1000,
      frames: (event.initiator.stack?.callFrames ?? []).slice(0, 8).map((frame) => ({
        functionName: frame.functionName,
        url: frame.url ? new URL(frame.url).pathname : '',
        lineNumber: frame.lineNumber,
        columnNumber: frame.columnNumber,
      })),
    });
  });
  const listener = (request: Request) => {
    if (new URL(request.url()).pathname === '/api/tos') requests.push(request);
  };
  page.on('request', listener);
  return {
    count: () => requests.length,
    finish: async () => {
      page.off('request', listener);
      await cdp.detach();
      const observed = await Promise.all(
        requests.map(async (request) => {
          const headers = await request.allHeaders();
          const names = (headers.cookie ?? '')
            .split(';')
            .map((part) => part.split('=', 1)[0].trim());
          const response = await request.response();
          return {
            method: request.method(),
            startedAt: request.timing().startTime,
            authenticatedCookie: names.includes('mirrorbuddy-user-id'),
            clientHint: names.includes('mirrorbuddy-user-id-client'),
            responseStatus: response?.status() ?? null,
            referrer: headers.referer ? new URL(headers.referer).pathname : '',
          };
        }),
      );
      return { requests: observed, initiators };
    },
  };
}
