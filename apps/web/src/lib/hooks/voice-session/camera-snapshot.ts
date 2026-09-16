import type { RefObject } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';

export const CAPTURE_WIDTH = 640;
export const CAPTURE_HEIGHT = 360;
const JPEG_QUALITY = 0.7;

export async function sendCameraSnapshot(
  stream: MediaStream | null,
  channelRef: RefObject<RTCDataChannel | null>,
  isActive: () => boolean,
): Promise<void> {
  if (!stream) {
    logger.warn('[UnifiedCamera] No stream for snapshot');
    return;
  }
  const video = document.createElement('video');
  try {
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    if (!isActive()) return;

    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Snapshot canvas context unavailable');
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
    const channel = channelRef.current;
    if (!base64 || !channel) {
      logger.warn('[UnifiedCamera] Snapshot data or connection unavailable');
      return;
    }
    channel.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_image', image_url: `data:image/jpeg;base64,${base64}` }],
        },
      }),
    );
    channel.send(JSON.stringify({ type: 'response.create' }));
    logger.info('[UnifiedCamera] Snapshot sent with response.create');
  } catch (error) {
    logger.error('[UnifiedCamera] Snapshot failed', { error: String(error) });
  } finally {
    video.pause();
    video.srcObject = null;
    video.remove();
  }
}
