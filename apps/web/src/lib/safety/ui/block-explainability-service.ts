/**
 * Block Explainability Service
 * Part of Ethical Design Hardening (F-06)
 *
 * Provides child-friendly explanations for blocked content,
 * helping students understand why certain content is unavailable.
 */

import { logger } from '@/lib/logger';
import {
  BlockExplanation,
  SafetyFilterResult,
  SafetyFilterType,
  SAFETY_LABELS,
} from './types';

const log = logger.child({ module: 'block-explainability' });

/**
 * Educational topic suggestions based on subject context
 */
const EDUCATIONAL_ALTERNATIVES: Record<string, string[]> = {
  science: [
    'esperimenti sicuri da fare a casa',
    'come funziona il corpo umano',
    'il sistema solare',
    'gli animali e i loro habitat',
  ],
  history: [
    'le civiltà antiche',
    'esploratori famosi',
    'invenzioni che hanno cambiato il mondo',
    'la vita quotidiana nel passato',
  ],
  literature: [
    'storie di avventura',
    'poesie famose',
    'miti e leggende',
    'biografie di scrittori',
  ],
  math: [
    'giochi matematici',
    'la matematica nella vita quotidiana',
    'curiosità sui numeri',
    'problemi divertenti',
  ],
  general: [
    'curiosità sul mondo',
    'come funzionano le cose',
    'domande sui tuoi compiti',
    'argomenti delle tue materie preferite',
  ],
};

/**
 * Generate user-friendly explanation for blocked content
 */
export function generateBlockExplanation(
  result: SafetyFilterResult,
  subjectContext?: string
): BlockExplanation {
  const filterType = result.filterType || 'unknown';

  const explanation = buildExplanation(filterType, subjectContext);

  log.debug('Generated block explanation', {
    filterType,
    suggestAskParent: explanation.suggestAskParent,
  });

  return explanation;
}

/**
 * Build explanation based on filter type
 */
function buildExplanation(
  filterType: SafetyFilterType,
  subjectContext?: string
): BlockExplanation {
  const subject = subjectContext || 'general';
  const alternatives =
    EDUCATIONAL_ALTERNATIVES[subject] || EDUCATIONAL_ALTERNATIVES.general;

  switch (filterType) {
    case 'content_inappropriate':
      return {
        filterType,
        friendlyExplanation:
          'Questo argomento non è adatto per MirrorBuddy. ' +
          'Sono qui per aiutarti a studiare e imparare cose nuove!',
        suggestedAction: SAFETY_LABELS.actions.try_different,
        suggestAskParent: true,
        relatedAllowedTopics: alternatives,
      };

    case 'off_topic':
      return {
        filterType,
        friendlyExplanation:
          'Questa domanda è un po\' fuori tema. ' +
          'Come tuo tutor, sono specializzato nelle materie scolastiche.',
        suggestedAction: SAFETY_LABELS.actions.stay_on_topic,
        suggestAskParent: false,
        relatedAllowedTopics: alternatives,
      };

    case 'personal_info_request':
      return {
        filterType,
        friendlyExplanation:
          'Non ho bisogno delle tue informazioni personali per aiutarti. ' +
          'La tua privacy è importante e va protetta!',
        suggestedAction: SAFETY_LABELS.actions.ask_parent,
        suggestAskParent: true,
        relatedAllowedTopics: undefined,
      };

    case 'harmful_content':
      return {
        filterType,
        friendlyExplanation:
          'Mi dispiace, ma non posso parlare di questo argomento. ' +
          'Se hai bisogno di aiuto o ti senti in difficoltà, ' +
          'parla con un adulto di fiducia.',
        suggestedAction: SAFETY_LABELS.actions.ask_parent,
        suggestAskParent: true,
        relatedAllowedTopics: undefined,
      };

    case 'manipulation_attempt':
      return {
        filterType,
        friendlyExplanation:
          'Non ho capito bene cosa mi stai chiedendo. ' +
          'Puoi riformulare la domanda in modo più semplice?',
        suggestedAction: SAFETY_LABELS.actions.rephrase,
        suggestAskParent: false,
        relatedAllowedTopics: alternatives,
      };

    case 'medical_advice':
      return {
        filterType,
        friendlyExplanation:
          'Le domande sulla salute sono importanti, ma non sono un dottore. ' +
          'I tuoi genitori o il medico possono aiutarti meglio.',
        suggestedAction: SAFETY_LABELS.actions.ask_parent,
        suggestAskParent: true,
        relatedAllowedTopics: [
          'come funziona il corpo umano (per studiare)',
          'educazione alimentare',
          'importanza dell\'attività fisica',
        ],
      };

    case 'legal_advice':
      return {
        filterType,
        friendlyExplanation:
          'Le questioni legali sono complicate e ogni situazione è diversa. ' +
          'I tuoi genitori possono aiutarti a trovare le risposte giuste.',
        suggestedAction: SAFETY_LABELS.actions.ask_parent,
        suggestAskParent: true,
        relatedAllowedTopics: [
          'educazione civica',
          'come funziona lo Stato',
          'i diritti dei bambini',
        ],
      };

    default:
      return {
        filterType,
        friendlyExplanation:
          'Non posso rispondere a questa domanda in questo momento. ' +
          'Proviamo con qualcos\'altro!',
        suggestedAction: SAFETY_LABELS.actions.try_different,
        suggestAskParent: false,
        relatedAllowedTopics: alternatives,
      };
  }
}

/**
 * Get appropriate emoji for the explanation (for UI)
 */
export function getExplanationEmoji(filterType: SafetyFilterType): string {
  switch (filterType) {
    case 'content_inappropriate':
    case 'harmful_content':
      return '🛡️';
    case 'off_topic':
      return '📚';
    case 'personal_info_request':
      return '🔒';
    case 'manipulation_attempt':
      return '🤔';
    case 'medical_advice':
      return '🏥';
    case 'legal_advice':
      return '⚖️';
    default:
      return 'ℹ️';
  }
}

/**
 * Format explanation for display with optional emoji
 */
export function formatExplanationForDisplay(
  explanation: BlockExplanation,
  includeEmoji: boolean = false
): string {
  const emoji = includeEmoji
    ? getExplanationEmoji(explanation.filterType) + ' '
    : '';

  let display = `${emoji}${explanation.friendlyExplanation}\n\n`;
  display += `💡 ${explanation.suggestedAction}`;

  if (
    explanation.relatedAllowedTopics &&
    explanation.relatedAllowedTopics.length > 0
  ) {
    display += '\n\nPuoi chiedermi invece di:\n';
    display += explanation.relatedAllowedTopics
      .slice(0, 3)
      .map((topic) => `• ${topic}`)
      .join('\n');
  }

  if (explanation.suggestAskParent) {
    display += '\n\n👨‍👩‍👧 Se hai dubbi, chiedi a un genitore.';
  }

  return display;
}
