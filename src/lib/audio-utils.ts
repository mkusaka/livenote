/**
 * Audio processing utilities for OpenAI Realtime API
 */

/**
 * Convert Float32Array audio data to Int16 PCM
 * Browser's AudioContext outputs Float32 (-1 to 1), OpenAI needs Int16 PCM
 */
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp the value between -1 and 1
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit integer
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

/**
 * Downsample audio from source sample rate to target sample rate
 * Browser typically records at 48kHz, OpenAI Realtime API needs 24kHz
 */
export function downsample(
  audioData: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return audioData;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const sourceIndex = Math.round(i * ratio);
    result[i] = audioData[sourceIndex];
  }

  return result;
}

/**
 * Convert Int16Array to base64 string for WebSocket transmission
 */
export function int16ToBase64(int16Array: Int16Array): string {
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Process audio buffer for OpenAI Realtime API
 * Converts browser audio (Float32, 48kHz) to OpenAI format (Int16 PCM, 24kHz, base64)
 */
export function processAudioForRealtime(
  audioData: Float32Array,
  sourceSampleRate: number = 48000,
  targetSampleRate: number = 24000
): string {
  // Downsample to target rate
  const downsampled = downsample(audioData, sourceSampleRate, targetSampleRate);
  // Convert to Int16 PCM
  const int16 = float32ToInt16(downsampled);
  // Convert to base64
  return int16ToBase64(int16);
}
