import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test, expect } from './fixtures';
import './hardware';

test('actual microphone helper consumes browser-native DOMException at its hardware boundary', async ({
  media,
}) => {
  const { page, helperBundle } = media;
  const source = readFileSync(helperBundle, 'utf8');
  const helperUrl = new URL('/__c5/native-helper.js', page.url()).href;
  const workerUrl = new URL('/sw.js', page.url()).href;
  const sourceHash = createHash('sha256').update(source).digest('hex');
  await expect
    .poll(() =>
      page.evaluate(() => ({
        state: navigator.serviceWorker.controller?.state,
        url: navigator.serviceWorker.controller?.scriptURL,
      })),
    )
    .toEqual({ state: 'activated', url: workerUrl });
  const fulfillments: Array<{ worker: string | null; fulfilled: boolean }> = [];
  await page.context().route(helperUrl, async (route) => {
    const record = { worker: route.request().serviceWorker()?.url() ?? null, fulfilled: false };
    fulfillments.push(record);
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: source,
    });
    record.fulfilled = true;
  });
  let deliveredHash: string | undefined;
  try {
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) => response.url() === helperUrl && response.fromServiceWorker(),
      ),
      page.evaluate(async () => {
        const script = document.createElement('script');
        script.nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ?? '';
        script.src = '/__c5/native-helper.js';
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Owned helper bundle did not load'));
          document.head.append(script);
        });
      }),
    ]);
    expect(response.status()).toBe(200);
    deliveredHash = createHash('sha256')
      .update(await response.body())
      .digest('hex');
    expect(deliveredHash).toBe(sourceHash);
    expect(fulfillments).toEqual([{ worker: workerUrl, fulfilled: true }]);
  } finally {
    await test.info().attach('native-helper-delivery', {
      body: JSON.stringify({
        workerControlledBeforeRequest: true,
        workerUrl,
        sourceHash,
        deliveredHash,
        fulfillments,
      }),
      contentType: 'application/json',
    });
  }
  const outcomes = await page.evaluate(async () => {
    const original = navigator.mediaDevices.getUserMedia;
    const audio = new AudioContext();
    const destination = audio.createMediaStreamDestination();
    const oscillator = audio.createOscillator();
    oscillator.connect(destination);
    oscillator.start();
    const result = [];
    try {
      for (const name of ['NotSupportedError', 'OverconstrainedError', 'NotAllowedError']) {
        for (const fallbackFails of [false, true]) {
          const calls: MediaStreamConstraints[] = [];
          const primary = new DOMException('Owned native microphone failure', name);
          const fallback = new DOMException('Owned fallback failure', 'NotAllowedError');
          navigator.mediaDevices.getUserMedia = async (constraints) => {
            calls.push(constraints ?? {});
            if (calls.length === 1) throw primary;
            if (fallbackFails) throw fallback;
            return destination.stream;
          };
          let sameStream = false,
            originalError = false;
          try {
            sameStream =
              (await window.C5MediaModule.requestMicrophoneStream({ echoCancellation: true })) ===
              destination.stream;
          } catch (error) {
            originalError = error === (name === 'NotAllowedError' ? primary : fallback);
          }
          result.push({
            name,
            fallbackFails,
            calls,
            sameStream,
            originalError,
            nativeDOMException: primary instanceof DOMException,
            alsoError: primary instanceof Error,
          });
        }
      }
      navigator.mediaDevices.getUserMedia = async () => destination.stream;
      result.push({
        supported: window.C5MediaModule.isWebRTCSupported(),
        healthy: (await window.C5MediaModule.requestMicrophoneStream()) === destination.stream,
      });
      return result;
    } finally {
      navigator.mediaDevices.getUserMedia = original;
      destination.stream.getTracks().forEach((track) => track.stop());
      oscillator.stop();
      oscillator.disconnect();
      await audio.close();
    }
  });
  await test.info().attach('native-exception-evidence', {
    body: JSON.stringify(outcomes),
    contentType: 'application/json',
  });
  for (const outcome of outcomes) {
    if ('healthy' in outcome) {
      expect(outcome).toEqual({ supported: true, healthy: true });
      continue;
    }
    expect(outcome.nativeDOMException).toBe(true);
    const denied = outcome.name === 'NotAllowedError';
    expect(outcome.calls).toHaveLength(denied ? 1 : 2);
    expect(outcome.calls[0]).toEqual({ audio: { echoCancellation: true }, video: false });
    if (!denied) expect(outcome.calls[1]).toEqual({ audio: true, video: false });
    expect(outcome.sameStream).toBe(!denied && !outcome.fallbackFails);
    expect(outcome.originalError).toBe(denied || outcome.fallbackFails);
  }
});

test('actual app registration activates and controls online navigations without script errors', async ({
  media,
}) => {
  const { page } = media;
  const offline = await page.request.get('/offline.html', { maxRedirects: 0 });
  const redirected = offline.headers().location;
  const target = redirected ? await page.request.get(redirected) : undefined;
  await test.info().attach('worker-offline-resource', {
    body: JSON.stringify({
      initialStatus: offline.status(),
      redirect: redirected,
      finalStatus: target?.status(),
      registrations: await page.evaluate(async () =>
        (await navigator.serviceWorker.getRegistrations()).map((registration) => ({
          scope: registration.scope,
          installing: registration.installing?.state,
          waiting: registration.waiting?.state,
          active: registration.active?.state,
        })),
      ),
    }),
    contentType: 'application/json',
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.some(
          (registration) =>
            registration.active?.scriptURL === `${location.origin}/sw.js` &&
            registration.active.state === 'activated',
        );
      }),
    )
    .toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toBe(`${new URL(page.url()).origin}/sw.js`);
  for (const pathname of ['/it/astuccio', '/it/supporti', '/it']) {
    const response = await page.goto(pathname, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    expect(await page.evaluate(() => navigator.onLine)).toBe(true);
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated');
    await expect(page.locator('body')).not.toContainText('Application error');
  }
});
