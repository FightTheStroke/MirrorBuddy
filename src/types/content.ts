// ============================================================================
// CONTENT TYPES - Maestros and Subjects
// ============================================================================

export type MaestroVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse';

export type Subject =
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'history'
  | 'geography'
  | 'italian'
  | 'english'
  | 'spanish'
  | 'art'
  | 'music'
  | 'civics'
  | 'economics'
  | 'computerScience'
  | 'health'
  | 'philosophy'
  | 'internationalLaw'
  | 'storytelling'
  | 'supercazzola';

export interface Maestro {
  id: string;
  name: string;
  subject: Subject;
  specialty: string;
  voice: MaestroVoice;
  voiceInstructions: string;  // How to speak/personality for voice
  teachingStyle: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  greeting: string;
  excludeFromGamification?: boolean;  // If true, sessions don't earn XP
  tools?: string[];  // Available tools; if empty or only 'web_search', hide toolbar
}
