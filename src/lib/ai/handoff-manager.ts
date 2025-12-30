/**
 * ConvergioEdu Handoff Manager
 *
 * Manages character handoffs during conversations.
 * Detects when a character should suggest switching to another,
 * and orchestrates the handoff flow.
 *
 * Part of I-05: Handoff Between Characters
 * Related: #23 Conversation-First Architecture
 */

import type {
  CharacterType,
  ExtendedStudentProfile,
  SupportTeacher,
  BuddyProfile,
} from '@/types';
import type { MaestroFull } from '@/data/maestri-full';
import type { ActiveCharacter, HandoffSuggestion } from '@/lib/stores/conversation-flow-store';
// Note: routeToCharacter, suggestCharacterSwitch, getCharacterGreeting available from character-router if needed
import { detectIntent, type IntentType } from './intent-detection';
import {
  getSupportTeacherById,
  getDefaultSupportTeacher,
} from '@/data/support-teachers';
import { getBuddyById, getDefaultBuddy } from '@/data/buddy-profiles';
import { getMaestroById, getMaestriBySubject } from '@/data/maestri-full';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for handoff analysis.
 */
export interface HandoffContext {
  /** Current message from student */
  message: string;
  /** AI response that may contain handoff signals */
  aiResponse?: string;
  /** Currently active character */
  activeCharacter: ActiveCharacter;
  /** Student profile */
  studentProfile: ExtendedStudentProfile;
  /** Recent messages for context (last 5) */
  recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Result of handoff analysis.
 */
export interface HandoffAnalysis {
  /** Whether a handoff is recommended */
  shouldHandoff: boolean;
  /** The handoff suggestion if applicable */
  suggestion?: HandoffSuggestion;
  /** Confidence level (0-1) */
  confidence: number;
  /** Reason for the recommendation */
  reason: string;
}

/**
 * Handoff triggers that can be detected in AI responses.
 */
export type HandoffTrigger =
  | 'explicit_suggestion' // AI explicitly suggests another character
  | 'subject_mismatch' // Student asking about a different subject
  | 'emotional_need' // Student showing emotional distress
  | 'method_need' // Student needs study method help
  | 'stuck_pattern' // Conversation is stuck, need different approach
  | 'crisis_detected' // Crisis situation requiring buddy
  | 'academic_deep_dive'; // Need subject expert for deep content

// ============================================================================
// HANDOFF SIGNAL PATTERNS
// ============================================================================

/**
 * Patterns in AI responses that signal a handoff suggestion.
 */
const HANDOFF_SIGNAL_PATTERNS = {
  // Coach suggesting a Maestro
  maestro_suggestion: [
    /(?:ti consiglio|potresti parlare con|c'è|chiedi a|il (?:professor|maestro))\s+(\w+)/i,
    /per (?:questa materia|questo argomento).*?(?:meglio|ideale|perfetto)\s+(\w+)/i,
    /(?:euclide|feynman|manzoni|leonardo|shakespeare|curie|socrate|mozart|erodoto|humboldt|smith)/i,
  ],
  // Coach or Maestro suggesting Buddy for emotional support
  buddy_suggestion: [
    /(?:capisco che|sembra che).*?(?:difficile|stressante|preoccupato|ansioso)/i,
    /(?:mario|maria).*?(?:può aiutarti|ti capisce|può ascoltarti)/i,
    /(?:vuoi parlare con|potresti sentirti meglio parlando con).*?(?:un amico|qualcuno della tua età)/i,
  ],
  // Buddy suggesting Coach for method help
  coach_suggestion: [
    /(?:melissa|davide).*?(?:può aiutarti|sa come|organizzare)/i,
    /(?:per organizzarti|per il metodo|per pianificare).*?(?:chiedi a|parla con)/i,
  ],
  // Anyone detecting emotional crisis
  crisis_signals: [
    /(?:mi sento|sono)\s+(?:molto\s+)?(?:solo|triste|disperato|senza speranza)/i,
    /non ce la faccio più/i,
    /nessuno mi capisce/i,
    /voglio smettere/i,
  ],
};

/**
 * Intent patterns that suggest handoff.
 */
const INTENT_HANDOFF_MAP: Record<IntentType, CharacterType | null> = {
  academic_help: 'maestro',
  method_help: 'coach',
  emotional_support: 'buddy',
  crisis: 'buddy',
  tool_request: null, // Stay with current
  general_chat: null, // Stay with current
};

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyzes whether a handoff should occur.
 */
export function analyzeHandoff(context: HandoffContext): HandoffAnalysis {
  const { message, aiResponse, activeCharacter, studentProfile } = context;

  // 1. Check for explicit handoff signals in AI response
  if (aiResponse) {
    const explicitHandoff = detectExplicitHandoff(aiResponse, activeCharacter, studentProfile);
    if (explicitHandoff.shouldHandoff) {
      return explicitHandoff;
    }
  }

  // 2. Check message intent vs current character
  const intent = detectIntent(message);
  const intentMismatch = checkIntentMismatch(intent.type, activeCharacter.type, studentProfile);
  if (intentMismatch.shouldHandoff) {
    return intentMismatch;
  }

  // 3. Check for crisis signals
  const crisisCheck = detectCrisisSignals(message, aiResponse || '');
  if (crisisCheck.shouldHandoff) {
    return crisisCheck;
  }

  // 4. Check for subject change (Maestro → different Maestro)
  if (activeCharacter.type === 'maestro' && intent.subject) {
    const subjectChange = checkSubjectChange(
      activeCharacter.character as MaestroFull,
      intent.subject,
      studentProfile
    );
    if (subjectChange.shouldHandoff) {
      return subjectChange;
    }
  }

  // No handoff needed
  return {
    shouldHandoff: false,
    confidence: 0.9,
    reason: 'Current character is appropriate for this conversation',
  };
}

/**
 * Detects explicit handoff suggestions in AI response.
 */
function detectExplicitHandoff(
  response: string,
  currentCharacter: ActiveCharacter,
  profile: ExtendedStudentProfile
): HandoffAnalysis {
  // Check for Maestro suggestions
  for (const pattern of HANDOFF_SIGNAL_PATTERNS.maestro_suggestion) {
    const match = response.match(pattern);
    if (match && currentCharacter.type !== 'maestro') {
      const maestroName = match[1]?.toLowerCase();
      const suggestion = createMaestroSuggestion(maestroName, profile);
      if (suggestion) {
        return {
          shouldHandoff: true,
          suggestion,
          confidence: 0.85,
          reason: 'AI suggested a subject expert',
        };
      }
    }
  }

  // Check for Buddy suggestions
  for (const pattern of HANDOFF_SIGNAL_PATTERNS.buddy_suggestion) {
    if (pattern.test(response) && currentCharacter.type !== 'buddy') {
      return {
        shouldHandoff: true,
        suggestion: createBuddySuggestion(profile),
        confidence: 0.8,
        reason: 'AI detected emotional need and suggested peer support',
      };
    }
  }

  // Check for Coach suggestions
  for (const pattern of HANDOFF_SIGNAL_PATTERNS.coach_suggestion) {
    if (pattern.test(response) && currentCharacter.type !== 'coach') {
      return {
        shouldHandoff: true,
        suggestion: createCoachSuggestion(profile),
        confidence: 0.8,
        reason: 'AI suggested organization/method support',
      };
    }
  }

  return { shouldHandoff: false, confidence: 0, reason: '' };
}

/**
 * Checks if the detected intent mismatches the current character.
 */
function checkIntentMismatch(
  intentType: IntentType,
  currentType: CharacterType,
  profile: ExtendedStudentProfile
): HandoffAnalysis {
  const suggestedType = INTENT_HANDOFF_MAP[intentType];

  // No specific character suggested for this intent
  if (!suggestedType) {
    return { shouldHandoff: false, confidence: 0, reason: '' };
  }

  // Already with the right character type
  if (suggestedType === currentType) {
    return { shouldHandoff: false, confidence: 0, reason: '' };
  }

  // Create appropriate suggestion
  let suggestion: HandoffSuggestion | undefined;

  switch (suggestedType) {
    case 'maestro':
      // We'd need subject context for this - skip for now
      return { shouldHandoff: false, confidence: 0, reason: '' };
    case 'coach':
      suggestion = createCoachSuggestion(profile);
      break;
    case 'buddy':
      suggestion = createBuddySuggestion(profile);
      break;
  }

  if (suggestion) {
    return {
      shouldHandoff: true,
      suggestion,
      confidence: 0.7,
      reason: `Message intent (${intentType}) suggests ${suggestedType} would be better`,
    };
  }

  return { shouldHandoff: false, confidence: 0, reason: '' };
}

/**
 * Detects crisis signals that require immediate buddy support.
 */
function detectCrisisSignals(message: string, response: string): HandoffAnalysis {
  const combined = `${message} ${response}`.toLowerCase();

  for (const pattern of HANDOFF_SIGNAL_PATTERNS.crisis_signals) {
    if (pattern.test(combined)) {
      return {
        shouldHandoff: true,
        suggestion: {
          toCharacter: createActiveCharacter(
            getDefaultBuddy(),
            'buddy',
            { name: 'Student' } as ExtendedStudentProfile
          ),
          reason: 'Ti sento un po\' giù. Vuoi parlare con qualcuno che ti capisce?',
          confidence: 0.95,
        },
        confidence: 0.95,
        reason: 'Crisis signals detected - immediate peer support recommended',
      };
    }
  }

  return { shouldHandoff: false, confidence: 0, reason: '' };
}

/**
 * Checks if the student is asking about a different subject.
 */
function checkSubjectChange(
  currentMaestro: MaestroFull,
  newSubject: string,
  profile: ExtendedStudentProfile
): HandoffAnalysis {
  // Get the current maestro's subject
  const currentSubject = currentMaestro.subject;

  // If it's the same subject, no handoff
  if (currentSubject === newSubject) {
    return { shouldHandoff: false, confidence: 0, reason: '' };
  }

  // Find a maestro for the new subject
  const newMaestri = getMaestriBySubject(newSubject as Parameters<typeof getMaestriBySubject>[0]);
  if (newMaestri.length > 0) {
    const newMaestro = newMaestri[0];
    return {
      shouldHandoff: true,
      suggestion: {
        toCharacter: createActiveCharacter(newMaestro, 'maestro', profile),
        reason: `Per ${newSubject}, ${newMaestro.name} è l'esperto!`,
        confidence: 0.85,
      },
      confidence: 0.85,
      reason: `Student asked about ${newSubject} while with ${currentSubject} Maestro`,
    };
  }

  return { shouldHandoff: false, confidence: 0, reason: '' };
}

// ============================================================================
// SUGGESTION CREATORS
// ============================================================================

/**
 * Creates a Coach handoff suggestion.
 */
function createCoachSuggestion(profile: ExtendedStudentProfile): HandoffSuggestion {
  const coach = profile.preferredCoach
    ? getSupportTeacherById(profile.preferredCoach) || getDefaultSupportTeacher()
    : getDefaultSupportTeacher();

  return {
    toCharacter: createActiveCharacter(coach, 'coach', profile),
    reason: `${coach.name} può aiutarti a organizzarti meglio!`,
    confidence: 0.8,
  };
}

/**
 * Creates a Buddy handoff suggestion.
 */
function createBuddySuggestion(profile: ExtendedStudentProfile): HandoffSuggestion {
  const buddy = profile.preferredBuddy
    ? getBuddyById(profile.preferredBuddy) || getDefaultBuddy()
    : getDefaultBuddy();

  return {
    toCharacter: createActiveCharacter(buddy, 'buddy', profile),
    reason: `${buddy.name} ti capisce e può ascoltarti!`,
    confidence: 0.8,
  };
}

/**
 * Creates a Maestro handoff suggestion by name.
 */
function createMaestroSuggestion(
  name: string | undefined,
  profile: ExtendedStudentProfile
): HandoffSuggestion | undefined {
  if (!name) return undefined;

  // Try to find a maestro by name
  const normalizedName = name.toLowerCase();

  // Map common names to IDs (only maestros that actually exist)
  const nameToId: Record<string, string> = {
    euclide: 'euclide-matematica',
    feynman: 'feynman-fisica',
    manzoni: 'manzoni-italiano',
    leonardo: 'leonardo-arte',
    shakespeare: 'shakespeare-inglese',
    curie: 'curie-chimica',
    socrate: 'socrate-filosofia',
    mozart: 'mozart-musica',
    erodoto: 'erodoto-storia',
    humboldt: 'humboldt-geografia',
    smith: 'smith-economia',
  };

  const maestroId = nameToId[normalizedName];
  if (!maestroId) return undefined;

  const maestro = getMaestroById(maestroId);
  if (!maestro) return undefined;

  return {
    toCharacter: createActiveCharacter(maestro, 'maestro', profile),
    reason: `${maestro.name} è l'esperto di ${maestro.subject}!`,
    confidence: 0.85,
  };
}

/**
 * Creates an ActiveCharacter from character data.
 */
function createActiveCharacter(
  character: MaestroFull | SupportTeacher | BuddyProfile,
  type: CharacterType,
  profile: ExtendedStudentProfile
): ActiveCharacter {
  // Import default voice settings
  const DEFAULT_MAESTRO_VOICE = 'sage';
  const DEFAULT_VOICE_INSTRUCTIONS = 'Speak clearly and engagingly.';

  if (type === 'buddy') {
    const buddy = character as BuddyProfile;
    return {
      type: 'buddy',
      id: buddy.id,
      name: buddy.name,
      character: buddy,
      greeting: buddy.getGreeting(profile),
      systemPrompt: buddy.getSystemPrompt(profile),
      color: buddy.color,
      voice: buddy.voice,
      voiceInstructions: buddy.voiceInstructions,
      subtitle: 'Peer Support',
    };
  }

  if (type === 'coach') {
    const coach = character as SupportTeacher;
    return {
      type: 'coach',
      id: coach.id,
      name: coach.name,
      character: coach,
      greeting: coach.greeting,
      systemPrompt: coach.systemPrompt,
      color: coach.color,
      voice: coach.voice,
      voiceInstructions: coach.voiceInstructions,
      subtitle: 'Learning Coach',
    };
  }

  // Maestro
  const maestro = character as MaestroFull;
  return {
    type: 'maestro',
    id: maestro.id,
    name: maestro.name,
    character: maestro,
    greeting: maestro.greeting,
    systemPrompt: maestro.systemPrompt,
    color: maestro.color,
    voice: DEFAULT_MAESTRO_VOICE,
    voiceInstructions: DEFAULT_VOICE_INSTRUCTIONS,
    subtitle: maestro.subject,
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if a handoff might be needed based on message alone.
 * Use for fast pre-filtering before full analysis.
 */
export function mightNeedHandoff(message: string): boolean {
  const intent = detectIntent(message);

  // High confidence intents that might trigger handoff
  if (intent.confidence > 0.7) {
    if (intent.type === 'crisis') return true;
    if (intent.type === 'emotional_support') return true;
    if (intent.subject) return true; // Subject mentioned - might need specific Maestro
  }

  return false;
}

/**
 * Generates a handoff message for the UI.
 */
export function generateHandoffMessage(
  fromCharacter: ActiveCharacter,
  toSuggestion: HandoffSuggestion
): string {
  const { reason } = toSuggestion;

  return `${fromCharacter.name}: "${reason}"`;
}

/**
 * Generates the transition message when handoff is accepted.
 */
export function generateTransitionMessage(
  fromCharacter: ActiveCharacter,
  toCharacter: ActiveCharacter
): string {
  return `${fromCharacter.name} ti ha passato a ${toCharacter.name}. ${toCharacter.greeting}`;
}
