/**
 * Constants for accessibility showcase
 */

import {
  Type,
  Sun,
  Eye,
  Pause,
  Volume2,
  Brain,
} from 'lucide-react';

export const TOGGLE_SETTINGS = [
  { key: 'dyslexiaFont', label: 'Font Dislessia', icon: Type },
  { key: 'extraLetterSpacing', label: 'Spaziatura Lettere', icon: Type },
  { key: 'increasedLineHeight', label: 'Interlinea Alta', icon: Type },
  { key: 'highContrast', label: 'Alto Contrasto', icon: Sun },
  { key: 'largeText', label: 'Testo Grande', icon: Eye },
  { key: 'reducedMotion', label: 'Animazioni Ridotte', icon: Pause },
  { key: 'ttsEnabled', label: 'Sintesi Vocale', icon: Volume2 },
  { key: 'distractionFreeMode', label: 'Modalita Focus', icon: Brain },
];
