// Chat API types — minimal cross-package contract.
// Only exports types used by @mirrorbuddy/types internals (currently
// just SupportedLanguage, consumed by greeting). Richer runtime types
// like ChatMessage / ChatRequest stay in src/app/api/chat/types.ts
// because they overlap with conversation.ts's own ChatMessage and
// belong to the app layer.

/** Supported UI languages */
export type SupportedLanguage = 'it' | 'en' | 'es' | 'fr' | 'de';
