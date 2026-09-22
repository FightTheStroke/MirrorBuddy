'use client';

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { clientLogger as logger } from '@/lib/logger/client';

export interface CapturePhotoOptions {
  source: 'camera' | 'gallery';
  quality?: number;
  errorOwner?: 'bridge' | 'caller';
}
export interface PhotoResult {
  base64: string;
  format: string;
}

export async function capturePhoto(options: CapturePhotoOptions): Promise<PhotoResult> {
  if (!Capacitor.isNativePlatform()) return capturePhotoWeb(options);
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: options.source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      quality: options.quality ?? 90,
      correctOrientation: true,
      allowEditing: false,
    });
    logger.debug('[MediaBridge] Photo captured via Capacitor', {
      format: photo.format,
      platform: Capacitor.getPlatform(),
    });
    return { base64: photo.base64String || '', format: photo.format || 'jpeg' };
  } catch (error) {
    if (options.errorOwner !== 'caller')
      logger.error('[MediaBridge] Capacitor camera error', undefined, error);
    throw error;
  }
}

function capturePhotoWeb(options: CapturePhotoOptions): Promise<PhotoResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (options.source === 'camera') input.capture = 'environment';
    const cleanup = () => {
      input.onchange = null;
      input.oncancel = null;
      input.onerror = null;
    };
    const cancel = () => {
      cleanup();
      reject(new DOMException('Photo selection cancelled', 'AbortError'));
    };
    input.oncancel = cancel;
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement | null)?.files?.[0];
      if (!file) {
        cancel();
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        const format = file.type.split('/')[1] || 'jpeg';
        logger.debug('[MediaBridge] Photo captured via web', { format });
        resolve({ base64, format });
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };
    input.onerror = () => {
      cleanup();
      reject(new Error('File input error'));
    };
    input.click();
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result.split(',')[1] : undefined;
      if (!base64) reject(new Error('Image file is empty'));
      else resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.onabort = () => reject(new DOMException('Photo selection cancelled', 'AbortError'));
    reader.readAsDataURL(file);
  });
}
