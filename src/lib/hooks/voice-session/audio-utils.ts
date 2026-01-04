// ============================================================================
// AUDIO CONVERSION UTILITIES
// Base64, PCM16, Float32 conversion and resampling
// ============================================================================

/**
 * Convert base64-encoded PCM16 to Int16Array
 */
export function base64ToInt16Array(base64: string): Int16Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

/**
 * Convert Int16Array to base64-encoded PCM16
 */
export function int16ArrayToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

/**
 * Convert Float32 audio samples to Int16 PCM
 */
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  return int16Array;
}

/**
 * Convert Int16 PCM to Float32 audio samples
 */
export function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
  }
  return float32Array;
}

/**
 * Resample audio from one sample rate to another using linear interpolation
 */
export function resample(inputData: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return inputData;

  const ratio = fromRate / toRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    output[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
  }

  return output;
}
