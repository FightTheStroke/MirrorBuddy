// ============================================================================
// USER TYPES - Student Profile, Settings, Curriculum
// ============================================================================

export type Curriculum =
  | 'liceoClassico'
  | 'liceoScientifico'
  | 'liceoLinguistico'
  | 'liceoArtistico'
  | 'liceoMusicale'
  | 'istitutoTecnico'
  | 'istitutoProfessionale'
  | 'scuolaMedia'
  | 'scuolaElementare';

export type SchoolLevel = 'elementare' | 'media' | 'superiore';

export interface StudentProfile {
  name: string;
  age: number;
  schoolYear: number;
  schoolLevel: SchoolLevel;
  curriculum?: Curriculum;
  // Accessibility
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  dyslexiaFont: boolean;
  voiceEnabled: boolean;
  simplifiedLanguage: boolean;
  adhdMode: boolean;
}

// === SETTINGS TYPES ===

export type Theme = 'light' | 'dark' | 'system';

export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'azure'
  | 'gemini'
  | 'openrouter'
  | 'perplexity'
  | 'grok'
  | 'ollama';

export interface Settings {
  theme: Theme;
  provider: AIProvider;
  model: string;
  budgetLimit: number;
  studentProfile: StudentProfile;
}
