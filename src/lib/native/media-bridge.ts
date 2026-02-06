/**
 * Media Bridge - Capacitor Camera/Microphone Abstraction
 *
 * Provides unified interface for camera and microphone access:
 * - Native: Uses Capacitor Camera plugin (@capacitor/camera)
 * - Web: Falls back to browser APIs (file input, getUserMedia)
 *
 * Note: Capacitor doesn't have a separate microphone plugin.
 * Microphone access uses standard getUserMedia API on all platforms.
 */

"use client";

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { logger } from "@/lib/logger";

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Check if running on native platform (iOS/Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get current platform name
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

// ============================================================================
// Camera Photo Capture
// ============================================================================

export interface CapturePhotoOptions {
  source: "camera" | "gallery";
  quality?: number; // 0-100, default 90
}

export interface PhotoResult {
  base64: string;
  format: string;
}

/**
 * Capture photo using native camera or gallery
 * Falls back to file input on web
 */
export async function capturePhoto(
  options: CapturePhotoOptions,
): Promise<PhotoResult> {
  const { source, quality = 90 } = options;

  if (isNativePlatform()) {
    // Use Capacitor Camera plugin on native platforms
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
        quality,
        correctOrientation: true,
        allowEditing: false,
      });

      logger.debug("[MediaBridge] Photo captured via Capacitor", {
        format: photo.format,
        platform: getPlatform(),
      });

      return {
        base64: photo.base64String || "",
        format: photo.format || "jpeg",
      };
    } catch (error) {
      logger.error("[MediaBridge] Capacitor camera error", { error });
      throw error;
    }
  } else {
    // Fallback to file input on web
    return capturePhotoWeb(options);
  }
}

/**
 * Web fallback: file input for photo selection
 */
function capturePhotoWeb(options: CapturePhotoOptions): Promise<PhotoResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    if (options.source === "camera") {
      input.capture = "environment";
    }

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        const format = file.type.split("/")[1] || "jpeg";

        logger.debug("[MediaBridge] Photo captured via web", { format });

        resolve({ base64, format });
      } catch (error) {
        reject(error);
      }
    };

    input.onerror = () => {
      reject(new Error("File input error"));
    };

    input.click();
  });
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Microphone Stream Access
// ============================================================================

export interface MicrophoneConstraints {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
}

/**
 * Request microphone access and return MediaStream
 * Uses standard getUserMedia API on all platforms
 * (Capacitor doesn't have a separate microphone plugin)
 */
export async function requestMicrophoneStream(
  constraints?: MicrophoneConstraints,
): Promise<MediaStream> {
  try {
    const audioConstraints =
      constraints && Object.keys(constraints).length > 0 ? constraints : true;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: false,
    });

    logger.debug("[MediaBridge] Microphone stream acquired", {
      tracks: stream.getAudioTracks().length,
      platform: getPlatform(),
    });

    return stream;
  } catch (error) {
    logger.error("[MediaBridge] Microphone access error", { error });
    throw error;
  }
}

/**
 * Stop microphone stream and release resources
 */
export function stopMicrophoneStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
  logger.debug("[MediaBridge] Microphone stream stopped");
}

// ============================================================================
// Permission Checks
// ============================================================================

export type PermissionStatus = "granted" | "denied" | "prompt";

/**
 * Check camera permission status
 */
export async function checkCameraPermission(): Promise<PermissionStatus> {
  if (isNativePlatform()) {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === "granted" ? "granted" : "denied";
    } catch (error) {
      logger.error("[MediaBridge] Camera permission check error", { error });
      return "denied";
    }
  } else {
    // Web: check if mediaDevices API is available
    if (navigator.mediaDevices) {
      return "prompt"; // Web doesn't expose permission state before requesting
    }
    return "denied";
  }
}

/**
 * Check microphone permission status
 */
export async function checkMicrophonePermission(): Promise<PermissionStatus> {
  try {
    // Try Permissions API (not supported on all platforms)
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return result.state as PermissionStatus;
    }
  } catch {
    // Permissions API not available or query failed
  }

  // Fallback: assume prompt state if API available
  return navigator.mediaDevices ? "prompt" : "denied";
}

/**
 * Request camera permissions (native only)
 */
export async function requestCameraPermission(): Promise<PermissionStatus> {
  if (isNativePlatform()) {
    try {
      const permissions = await Camera.requestPermissions();
      return permissions.camera === "granted" ? "granted" : "denied";
    } catch (error) {
      logger.error("[MediaBridge] Camera permission request error", { error });
      return "denied";
    }
  }

  // Web: permissions requested on getUserMedia call
  return checkCameraPermission();
}
