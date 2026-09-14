/**
 * @module accessibility
 * Accessibility Module - Barrel Export
 * F-08: Feature modules con boundaries chiari
 */

export {
  useAccessibilityStore,
  defaultAccessibilitySettings,
  defaultADHDConfig,
  defaultADHDStats,
} from './accessibility-store';

export type {
  AccessibilitySettings,
  ADHDSessionState,
  ADHDSessionConfig,
  ADHDSessionStats,
  A11yProfileId,
} from './accessibility-store';

export { applyMindmapKeyboardAccessibility } from './mindmap-keyboard-nav';
export type { MindmapKeyboardNavOptions } from './mindmap-keyboard-nav';

export { resolveSpeechLanguage, selectSpeechVoice } from './speech-locale';
export type { SpeechVoiceLike, SpeechVoiceMatch, SpeechVoiceSelection } from './speech-locale';
