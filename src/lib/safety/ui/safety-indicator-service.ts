/**
 * Safety Indicator Service
 * Part of Ethical Design Hardening (F-05)
 *
 * Provides UI configuration for safety-filtered responses.
 * Designed to be educational and child-friendly.
 */

import { logger } from '@/lib/logger';
import {
  SafetyFilterResult,
  SafetyFilterType,
  SafetyIndicatorConfig,
  SAFETY_LABELS,
} from './types';

const log = logger.child({ module: 'safety-indicator' });

/**
 * Get UI configuration for a safety filter result
 */
export function getSafetyIndicatorConfig(
  result: SafetyFilterResult
): SafetyIndicatorConfig {
  if (!result.wasFiltered) {
    return {
      show: false,
      severity: 'info',
      icon: 'info',
      color: 'blue',
      label: '',
      message: '',
    };
  }

  const filterType = result.filterType || 'unknown';
  const config = getConfigForFilterType(filterType);

  log.debug('Generated safety indicator config', {
    filterType,
    severity: config.severity,
  });

  return config;
}

/**
 * Get configuration for specific filter type
 */
function getConfigForFilterType(
  filterType: SafetyFilterType
): SafetyIndicatorConfig {
  switch (filterType) {
    case 'content_inappropriate':
      return {
        show: true,
        severity: 'blocked',
        icon: 'shield',
        color: 'red',
        label: SAFETY_LABELS.filterTypes.content_inappropriate,
        message: 'Questo contenuto non è adatto per la piattaforma.',
        explanation:
          'MirrorBuddy è pensato per aiutarti a studiare. ' +
          'Alcuni argomenti non sono appropriati per questa app.',
      };

    case 'off_topic':
      return {
        show: true,
        severity: 'warning',
        icon: 'info',
        color: 'yellow',
        label: SAFETY_LABELS.filterTypes.off_topic,
        message: 'Restiamo concentrati sullo studio!',
        explanation:
          'Il Maestro è qui per aiutarti con le materie scolastiche. ' +
          'Prova a fare domande sui tuoi compiti o argomenti di studio.',
      };

    case 'personal_info_request':
      return {
        show: true,
        severity: 'blocked',
        icon: 'shield',
        color: 'red',
        label: SAFETY_LABELS.filterTypes.personal_info_request,
        message: 'Non posso chiederti informazioni personali.',
        explanation:
          'La tua privacy è importante. Non condividere mai ' +
          'dati personali come indirizzo, telefono o password.',
      };

    case 'harmful_content':
      return {
        show: true,
        severity: 'blocked',
        icon: 'stop',
        color: 'red',
        label: SAFETY_LABELS.filterTypes.harmful_content,
        message: 'Questo argomento non è disponibile.',
        explanation:
          'Alcuni argomenti potrebbero non essere adatti. ' +
          'Se hai bisogno di aiuto, parla con un adulto di fiducia.',
      };

    case 'manipulation_attempt':
      return {
        show: true,
        severity: 'warning',
        icon: 'warning',
        color: 'orange',
        label: SAFETY_LABELS.filterTypes.manipulation_attempt,
        message: 'Non ho capito bene la richiesta.',
        explanation:
          'Prova a riformulare la tua domanda in modo più chiaro.',
      };

    case 'medical_advice':
      return {
        show: true,
        severity: 'warning',
        icon: 'warning',
        color: 'orange',
        label: SAFETY_LABELS.filterTypes.medical_advice,
        message: 'Per questioni di salute, chiedi a un medico.',
        explanation:
          'Non sono un dottore e non posso darti consigli medici. ' +
          'Parla con i tuoi genitori o un medico se hai domande sulla salute.',
      };

    case 'legal_advice':
      return {
        show: true,
        severity: 'warning',
        icon: 'warning',
        color: 'orange',
        label: SAFETY_LABELS.filterTypes.legal_advice,
        message: 'Per questioni legali, chiedi a un esperto.',
        explanation:
          'Non sono un avvocato. Per domande legali, ' +
          'i tuoi genitori possono aiutarti a trovare le risposte giuste.',
      };

    default:
      return {
        show: true,
        severity: 'info',
        icon: 'shield',
        color: 'blue',
        label: SAFETY_LABELS.filterTypes.unknown,
        message: 'Ho dovuto filtrare questa risposta.',
        explanation:
          'A volte devo fare attenzione a cosa rispondo. ' +
          'Prova a fare una domanda diversa.',
      };
  }
}

/**
 * Check if indicator should be shown prominently
 */
export function shouldShowProminentIndicator(
  config: SafetyIndicatorConfig
): boolean {
  return config.show && config.severity !== 'info';
}

/**
 * Get accessibility description for screen readers
 */
export function getAccessibleDescription(
  config: SafetyIndicatorConfig
): string {
  if (!config.show) {
    return '';
  }

  const severityText = SAFETY_LABELS.severity[config.severity];
  return `${severityText}: ${config.message}`;
}
