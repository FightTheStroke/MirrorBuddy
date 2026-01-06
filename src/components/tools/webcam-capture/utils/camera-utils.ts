/**
 * @file camera-utils.ts
 * @brief Camera utility functions
 */

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isContinuityCamera(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return lowerLabel.includes('iphone') || lowerLabel.includes('ipad');
}

export function isFrontFacing(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return (
    lowerLabel.includes('front') ||
    lowerLabel.includes('facetime') ||
    lowerLabel.includes('selfie') ||
    lowerLabel.includes('anteriore')
  );
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  isContinuity: boolean;
  isFrontFacing: boolean;
}

export async function enumerateCameras(): Promise<CameraDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 4)}`,
        isContinuity: isContinuityCamera(d.label),
        isFrontFacing: isFrontFacing(d.label),
      }));
  } catch {
    return [];
  }
}

