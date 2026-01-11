/**
 * Handoff signal patterns and detectors
 */

import type { CharacterType } from '@/types';
import type { IntentType } from './intent-detection/types';

/**
 * Intent patterns that suggest handoff
 */
export const INTENT_HANDOFF_MAP: Record<IntentType, CharacterType | null> = {
  academic_help: 'maestro',
  method_help: 'coach',
  emotional_support: 'buddy',
  crisis: 'buddy',
  tool_request: null,
  general_chat: null,
  tech_support: 'coach',
};

/**
 * Patterns in AI responses that signal a handoff suggestion
 */
export const HANDOFF_SIGNAL_PATTERNS = {
  maestro_suggestion: [
    /(?:ti consiglio|potresti parlare con|c'è|chiedi a|il (?:professor|maestro))\s+(\w+)/i,
    /per (?:questa materia|questo argomento).*?(?:meglio|ideale|perfetto)\s+(\w+)/i,
    /(?:euclide|feynman|manzoni|leonardo|shakespeare|curie|socrate|mozart|erodoto|humboldt|smith)/i,
  ],
  buddy_suggestion: [
    /(?:capisco che|sembra che).*?(?:difficile|stressante|preoccupato|ansioso)/i,
    /(?:mario|faty).*?(?:può aiutarti|ti capisce|può ascoltarti)/i,
    /(?:vuoi parlare con|potresti sentirti meglio parlando con).*?(?:un amico|qualcuno della tua età)/i,
  ],
  coach_suggestion: [
    /(?:melissa|roberto).*?(?:può aiutarti|sa come|organizzare)/i,
    /(?:per organizzarti|per il metodo|per pianificare).*?(?:chiedi a|parla con)/i,
  ],
  crisis_signals: [
    /(?:mi sento|sono)\s+(?:molto\s+)?(?:solo|triste|disperato|senza speranza)/i,
    /non ce la faccio più/i,
    /nessuno mi capisce/i,
    /voglio smettere/i,
  ],
};
