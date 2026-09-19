import { vi } from 'vitest';
import { useCameraManager } from './use-camera-manager';

export function readyFrameByDefault() {
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(640);
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(480);
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export function stream(label = 'Camera') {
  const track = {
    label,
    readyState: 'live',
    getSettings: () => ({ deviceId: label }),
    stop: vi.fn(() => {
      track.readyState = 'ended';
    }),
  };
  return { getTracks: () => [track], getVideoTracks: () => [track] };
}

export function Probe({
  preview = true,
  preferredCameraId,
}: {
  preview?: boolean;
  preferredCameraId?: string;
}) {
  const {
    videoRef,
    isLoading,
    errorType,
    error,
    activeCameraLabel,
    isSwitchingCamera,
    startCamera,
    switchCamera,
  } = useCameraManager({ preferredCameraId });
  return (
    <>
      {preview && <video ref={videoRef} />}
      <output data-testid="state">{isLoading ? 'loading' : errorType || 'ready'}</output>
      <output data-testid="error">{error}</output>
      <output data-testid="label">{activeCameraLabel}</output>
      <output data-testid="switching">{String(isSwitchingCamera)}</output>
      <button onClick={() => void startCamera()}>Retry</button>
      <button onClick={() => void switchCamera('chosen')}>Switch</button>
    </>
  );
}
