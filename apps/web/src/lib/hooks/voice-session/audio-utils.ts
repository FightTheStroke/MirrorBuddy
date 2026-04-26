// ============================================================================
// AUDIO CONVERSION UTILITIES
// Base64, PCM16, Float32 conversion and resampling
// ============================================================================

// Simple typed array pool for common sizes (reduces GC pressure)
// Note: Arrays passed to WebAudio API cannot be pooled (API takes ownership)
const float32Pool: Map<number, Float32Array[]> = new Map();
const MAX_POOL_SIZE = 4;

function getFloat32FromPool(size: number): Float32Array {
  const pool = float32Pool.get(size);
  if (pool && pool.length > 0) {
    return pool.pop()!;
  }
  return new Float32Array(size);
}

/** Return a Float32Array to pool for reuse (only if not passed to WebAudio) */
export function returnFloat32ToPool(array: Float32Array): void {
  const size = array.length;
  let pool = float32Pool.get(size);
  if (!pool) {
    pool = [];
    float32Pool.set(size, pool);
  }
  if (pool.length < MAX_POOL_SIZE) {
    pool.push(array);
  }
}

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
 * Uses pool for output array when possible (common resampling sizes)
 */
export function resample(inputData: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return inputData;

  const ratio = fromRate / toRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const output = getFloat32FromPool(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    output[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
  }

  return output;
}
