/**
 * DSA profile options offered in the PDF export modal.
 *
 * User-facing labels and descriptions are translated via next-intl under
 * `tools.studyKit.exportModal.profiles.<value>`. Only the stable `value`
 * (sent to the API) and the decorative `icon` live here.
 */

export const DSA_PROFILES = [
  { value: 'dyslexia', icon: 'Aa' },
  { value: 'dyscalculia', icon: '123' },
  { value: 'dysgraphia', icon: 'Aa' },
  { value: 'dysorthography', icon: 'ABC' },
  { value: 'adhd', icon: 'Aa' },
  { value: 'dyspraxia', icon: 'Aa' },
  { value: 'stuttering', icon: '~' },
] as const;

export type DSAProfile = (typeof DSA_PROFILES)[number]['value'];
