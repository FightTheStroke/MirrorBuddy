import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent } from '@testing-library/react';
import { logger } from '@/lib/logger';
import { clientLogger } from '@/lib/logger/client';
import { getTranslation } from '@/test/i18n-helpers';

export const cameraText = (key: string) => getTranslation(`tools.webcam.${key}`);
export const getUserMedia = vi.fn();
export const reports: { message: string; error: unknown }[] = [];
export const encodedCanvasStub = 'data:image/jpeg;base64,Y2FudmFzLXN0dWI=';
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
export function mediaStream() {
  const track = {
    readyState: 'live',
    label: 'Synthetic camera',
    getSettings: () => ({ deviceId: 'synthetic' }),
    stop: vi.fn(() => {
      track.readyState = 'ended';
    }),
  };
  return { getTracks: () => [track], getVideoTracks: () => [track] };
}
export function readyVideo() {
  const video = document.querySelector('video')!;
  Object.defineProperties(video, {
    videoWidth: { configurable: true, value: 640 },
    videoHeight: { configurable: true, value: 480 },
    readyState: { configurable: true, value: 2 },
  });
  fireEvent.loadedData(video);
  return video;
}

beforeEach(() => {
  vi.resetAllMocks();
  reports.length = 0;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const drawImage: CanvasRenderingContext2D['drawImage'] = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(encodedCanvasStub);
  for (const target of [logger, clientLogger]) {
    vi.spyOn(target, 'error').mockImplementation(
      (message: string, _context?: unknown, error?: unknown) => {
        reports.push({ message, error });
      },
    );
    vi.spyOn(target, 'warn').mockImplementation((message: string) => {
      reports.push({ message, error: undefined });
    });
    vi.spyOn(target, 'info').mockImplementation(() => {});
    vi.spyOn(target, 'debug').mockImplementation(() => {});
  }
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
});
