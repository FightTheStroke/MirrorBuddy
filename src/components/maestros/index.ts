/**
 * Barrel export for Maestro components
 * Maintains backward compatibility for existing imports
 */

export { MaestroSession } from './maestro-session';
export { MaestroCard } from './maestro-card';
export { MaestroCardFull } from './maestro-card-full';
export { MaestriGrid } from './maestri-grid';
export { MessageBubble } from './message-bubble';
export { QuoteRotator } from './quote-rotator';
export { PersonalizedSuggestion } from './personalized-suggestion';
// MaestroSessionHeader removed - use CharacterHeader from @/components/character
export { MaestroSessionInput } from './maestro-session-input';
export { MaestroSessionToolButtons } from './maestro-session-tool-buttons';
export { MaestroSessionMessages } from './maestro-session-messages';
export { MaestroSessionWebcam } from './maestro-session-webcam';
export { generateAutoEvaluation } from './maestro-session-utils';
export { useMaestroSessionLogic } from './use-maestro-session-logic';
