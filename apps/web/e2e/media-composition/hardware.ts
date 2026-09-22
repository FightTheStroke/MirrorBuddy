import type { Page } from '@playwright/test';

export type CameraMode = 'supported' | 'unsupported' | 'denied' | 'pending';
declare global {
  interface Window {
    c5Camera: {
      mode: CameraMode;
      calls: number;
      stops: number;
      streams: MediaStream[];
      grant: () => void;
    };
    C5MediaModule: {
      requestMicrophoneStream: (constraints?: MediaTrackConstraints) => Promise<MediaStream>;
      isWebRTCSupported: () => boolean;
    };
  }
}

export async function installCamera(page: Page, mode: CameraMode) {
  await page.addInitScript((initialMode: CameraMode) => {
    let grant: (() => void) | undefined;
    const state = (window.c5Camera = {
      mode: initialMode,
      calls: 0,
      stops: 0,
      streams: [] as MediaStream[],
      grant: () => {
        if (!grant) throw new Error('No owned pending camera request');
        grant();
        grant = undefined;
      },
    });
    const acquire = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Missing synthetic canvas');
      context.fillStyle = '#e85420';
      context.fillRect(0, 0, 160, 120);
      context.fillStyle = '#2054e8';
      context.fillRect(80, 0, 80, 120);
      const stream = canvas.captureStream(5);
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => {
          state.stops++;
          stop();
        };
      }
      state.streams.push(stream);
      return stream;
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          state.calls++;
          if (state.mode === 'unsupported')
            throw new DOMException('Owned unsupported camera', 'NotSupportedError');
          if (state.mode === 'denied')
            throw new DOMException('Owned denied camera', 'NotAllowedError');
          if (state.mode === 'pending')
            return new Promise<MediaStream>((resolve) => {
              grant = () => resolve(acquire());
            });
          return acquire();
        },
        enumerateDevices: async () => [],
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
  }, mode);
  const hydratedUser = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/user' &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );
  await page.reload({ waitUntil: 'load' });
  await hydratedUser;
}

export async function knownImage(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Missing fixture canvas');
    context.fillStyle = '#10c050';
    context.fillRect(0, 0, 48, 32);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name: 'c5-owned-image.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}

export async function decodedPixels(page: Page, selector: string) {
  return page.locator(selector).evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement)) throw new Error('Expected image');
    await element.decode();
    const canvas = document.createElement('canvas');
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Missing decode canvas');
    context.drawImage(element, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return {
      width: canvas.width,
      height: canvas.height,
      nonzero: pixels.some((value, index) => index % 4 !== 3 && value > 0),
    };
  });
}
