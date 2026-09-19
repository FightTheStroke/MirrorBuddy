/**
 * @file capture-utils.ts
 * @brief Capture utility functions
 */
import { capturePhoto } from '@/lib/native/media-bridge';

export async function importCameraPhoto(): Promise<string> {
  const photo = await capturePhoto({ source: 'gallery', errorOwner: 'caller' });
  if (!photo.base64 || !/^(jpeg|jpg|png|gif)$/.test(photo.format)) {
    throw new Error('Unsupported or empty image');
  }
  const data = `data:image/${photo.format};base64,${photo.base64}`;
  const image = new Image();
  image.src = data;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image has no dimensions');
  return data;
}

export function hasVideoFrame(video: HTMLVideoElement | null | undefined): boolean {
  return !!video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

export function waitForVideoFrame(video: HTMLVideoElement, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  if (hasVideoFrame(video)) return Promise.resolve(true);
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadeddata', ready);
      video.removeEventListener('resize', ready);
      video.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
    };
    const ready = () => {
      if (!hasVideoFrame(video)) return;
      cleanup();
      resolve(true);
    };
    const failed = () => {
      cleanup();
      reject(video.error ?? new Error('Camera preview failed'));
    };
    const aborted = () => {
      cleanup();
      resolve(false);
    };
    video.addEventListener('loadeddata', ready);
    video.addEventListener('resize', ready);
    video.addEventListener('error', failed);
    signal.addEventListener('abort', aborted, { once: true });
  });
}

export function captureImageFromVideo(
  video: HTMLVideoElement | null | undefined,
  canvas: HTMLCanvasElement | null | undefined,
): string | null {
  if (!video || !canvas || !hasVideoFrame(video)) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  const image = canvas.toDataURL('image/jpeg', 0.9);
  return image.startsWith('data:image/jpeg;base64,') && image.split(',')[1] ? image : null;
}
