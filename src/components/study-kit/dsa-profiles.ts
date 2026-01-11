/**
 * DSA Profile configurations for PDF export
 */

export const DSA_PROFILES = [
  {
    value: 'dyslexia',
    label: 'Dislessia',
    description: 'Font grande, spaziatura aumentata, alto contrasto',
    icon: 'Aa',
  },
  {
    value: 'dyscalculia',
    label: 'Discalculia',
    description: 'Numeri grandi, operatori colorati, griglia visiva',
    icon: '123',
  },
  {
    value: 'dysgraphia',
    label: 'Disgrafia',
    description: 'Layout strutturato, spaziatura ampia',
    icon: 'Aa',
  },
  {
    value: 'dysorthography',
    label: 'Disortografia',
    description: 'Pattern ortografici evidenziati, sillabe colorate',
    icon: 'ABC',
  },
  {
    value: 'adhd',
    label: 'DOP/ADHD',
    description: 'Minime distrazioni, sezioni chiare, termini evidenziati',
    icon: 'Aa',
  },
  {
    value: 'dyspraxia',
    label: 'Disprassia',
    description: 'Testo suddiviso, tempo di lettura, pause',
    icon: 'Aa',
  },
  {
    value: 'stuttering',
    label: 'Balbuzie',
    description: 'Frasi brevi, punti di respirazione, ritmo fluido',
    icon: '~',
  },
] as const;

export type DSAProfile = typeof DSA_PROFILES[number]['value'];
