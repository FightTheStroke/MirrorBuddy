/**
 * Neutral study-coach opener helpers.
 *
 * A child session must never start by dropping the child straight into a subject
 * Maestro's persona (e.g. Manzoni). Instead it opens on behalf of the profile's
 * chosen study coach, who greets the child and — when the subject isn't known yet
 * — asks the organizing questions before the right Maestro takes over.
 */
import {
  getSupportTeacherById,
  getDefaultSupportTeacher,
  type CoachId,
} from '@/data/support-teachers';

type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * Resolve the display name of the child's chosen study coach, falling back to the
 * default coach (Melissa) when the profile has no preference or an unknown id.
 */
export function resolveCoachName(preferredCoach: string | null | undefined): string {
  const coach =
    (preferredCoach && getSupportTeacherById(preferredCoach as CoachId)) ||
    getDefaultSupportTeacher();
  return coach.name;
}

/**
 * Build the localized neutral opener. Uses the short `withSubject` variant when the
 * subject is already known (so it doesn't block the subject Maestro / tool
 * auto-trigger), otherwise the guided-questions `general` variant.
 */
export function buildCoachOpener(
  preferredCoach: string | null | undefined,
  subjectLabel: string | undefined,
  t: Translate,
): string {
  const coach = resolveCoachName(preferredCoach);
  return subjectLabel
    ? t('coachOpener.withSubject', { coach, subject: subjectLabel })
    : t('coachOpener.general', { coach });
}
