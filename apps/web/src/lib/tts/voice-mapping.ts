/**
 * TTS Voice Mapping for gpt-audio-1.5
 *
 * Manages voice name compatibility across different TTS providers:
 * - OpenAI TTS (tts-1, tts-1-hd): 6 voices (alloy, echo, fable, onyx, nova, shimmer)
 * - Azure OpenAI TTS (tts-hd): 6 voices (same as OpenAI)
 * - gpt-audio-1.5 (Chat Completions API): 6 voices (same as TTS APIs)
 *
 * All three providers use the same voice names, ensuring compatibility
 * across different TTS implementations.
 */

/**
 * Valid voice names for OpenAI TTS and gpt-audio-1.5
 */
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * All supported TTS voices
 */
export const SUPPORTED_TTS_VOICES: readonly TTSVoice[] = [
  'alloy',
  'echo',
  'fable',
  'onyx',
  'nova',
  'shimmer',
];

/**
 * Default voice when none is specified
 */
export const DEFAULT_TTS_VOICE: TTSVoice = 'shimmer';

/**
 * Voice descriptions for UI display
 */
export const VOICE_DESCRIPTIONS: Record<TTSVoice, string> = {
  alloy: 'Clear and professional',
  echo: 'Warm and resonant',
  fable: 'Storyteller voice',
  onyx: 'Deep and smooth',
  nova: 'Energetic and bright',
  shimmer: 'Gentle and melodic',
};

/**
 * Validate if a voice name is supported
 *
 * @param voice - Voice name to validate
 * @returns True if voice is supported, false otherwise
 */
export function isSupportedVoice(voice: unknown): voice is TTSVoice {
  return typeof voice === 'string' && SUPPORTED_TTS_VOICES.includes(voice as TTSVoice);
}

/**
 * Get a validated voice name or return default
 *
 * @param voice - Requested voice name
 * @returns Valid voice name or default voice
 */
export function getValidVoice(voice?: string | null): TTSVoice {
  if (isSupportedVoice(voice)) {
    return voice;
  }
  return DEFAULT_TTS_VOICE;
}

/**
 * Get all available voices for API response
 *
 * @returns Array of supported voice names
 */
export function getAvailableVoices(): TTSVoice[] {
  return [...SUPPORTED_TTS_VOICES];
}

/**
 * Get voice options for UI selection
 *
 * @returns Array of voice options with value and label
 */
export function getVoiceOptions(): Array<{ value: TTSVoice; label: string; description: string }> {
  return SUPPORTED_TTS_VOICES.map((voice) => ({
    value: voice,
    label: voice.charAt(0).toUpperCase() + voice.slice(1),
    description: VOICE_DESCRIPTIONS[voice],
  }));
}
