/**
 * Reads a tier's feature list from the message catalogue.
 *
 * Reading the array itself replaces the previous approach of probing seven
 * fixed indices and swallowing the failures: next-intl still logged a console
 * error for every index that did not exist, so the pricing page reported seven
 * missing translations on every render while looking perfectly fine on screen.
 */

type RawReader = { raw: (key: string) => unknown };

export function featuresFor(t: RawReader, tierKey: string): string[] {
  const raw = t.raw(`tiers.${tierKey}.features`);
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === 'string');
}
