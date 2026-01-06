/**
 * @file capture-utils.ts
 * @brief Capture utility functions
 */

export function captureImageFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  return canvas.toDataURL('image/jpeg', 0.9);
}

