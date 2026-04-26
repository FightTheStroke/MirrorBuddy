/**
 * Constants for info-step component
 * School levels and learning difference definitions
 */

export const SCHOOL_LEVELS = [
  { id: 'elementare', label: 'Elementare', years: '6-10 anni' },
  { id: 'media', label: 'Media', years: '11-13 anni' },
  { id: 'superiore', label: 'Superiore', years: '14-19 anni' },
] as const;

export const LEARNING_DIFFERENCES = [
  { id: 'dyslexia', label: 'Dislessia', icon: '📖' },
  { id: 'dyscalculia', label: 'Discalculia', icon: '🔢' },
  { id: 'dysgraphia', label: 'Disgrafia', icon: '✏️' },
  { id: 'adhd', label: 'ADHD', icon: '⚡' },
  { id: 'autism', label: 'Autismo', icon: '🧩' },
  { id: 'cerebralPalsy', label: 'Paralisi Cerebrale', icon: '💪' },
  { id: 'visualImpairment', label: 'Difficoltà Visive', icon: '👁️' },
  { id: 'auditoryProcessing', label: 'Difficoltà Uditive', icon: '👂' },
] as const;
