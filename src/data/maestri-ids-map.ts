/**
 * Maestri ID Mapping and System Prompt Helper
 * Maps short IDs to full CLI IDs and retrieves system prompts
 */

import { getMaestroById as getFullMaestroById } from './maestri';
import { logger } from '@/lib/logger';

export const ID_MAP: Record<string, string> = {
  'euclide': 'euclide-matematica',
  'feynman': 'feynman-fisica',
  'galileo': 'galileo-astronomia',
  'curie': 'curie-chimica',
  'darwin': 'darwin-scienze',
  'erodoto': 'erodoto-storia',
  'humboldt': 'humboldt-geografia',
  'manzoni': 'manzoni-italiano',
  'omero': 'omero-italiano',
  'shakespeare': 'shakespeare-inglese',
  'alex-pina': 'alex-pina-spagnolo',
  'leonardo': 'leonardo-arte',
  'mozart': 'mozart-musica',
  'cicerone': 'cicerone-civica',
  'smith': 'smith-economia',
  'lovelace': 'lovelace-informatica',
  'ippocrate': 'ippocrate-corpo',
  'socrate': 'socrate-filosofia',
  'chris': 'chris-storytelling',
};

export function getFullSystemPrompt(shortId: string): string {
  const fullId = ID_MAP[shortId];
  if (!fullId) {
    logger.warn('No CLI mapping for maestro', { shortId });
    return '';
  }
  const fullMaestro = getFullMaestroById(fullId);
  if (!fullMaestro) {
    logger.warn('CLI maestro not found', { fullId });
    return '';
  }
  return fullMaestro.systemPrompt;
}
