/**
 * Constants for info-step component
 * School levels and learning difference definitions
 *
 * Labels are resolved via i18n (welcome.welcomeForm namespace).
 * Only IDs, icons, and translation keys are stored here.
 */

export const SCHOOL_LEVELS = [
  {
    id: "elementare" as const,
    labelKey: "schoolElementary" as const,
    yearsKey: "schoolYearsElementary" as const,
  },
  {
    id: "media" as const,
    labelKey: "schoolMiddle" as const,
    yearsKey: "schoolYearsMiddle" as const,
  },
  {
    id: "superiore" as const,
    labelKey: "schoolHigh" as const,
    yearsKey: "schoolYearsHigh" as const,
  },
] as const;

export const LEARNING_DIFFERENCES = [
  { id: "dyslexia" as const, icon: "📖", labelKey: "diffDyslexia" as const },
  {
    id: "dyscalculia" as const,
    icon: "🔢",
    labelKey: "diffDyscalculia" as const,
  },
  {
    id: "dysgraphia" as const,
    icon: "✏️",
    labelKey: "diffDysgraphia" as const,
  },
  { id: "adhd" as const, icon: "⚡", labelKey: "diffAdhd" as const },
  { id: "autism" as const, icon: "🧩", labelKey: "diffAutism" as const },
  {
    id: "cerebralPalsy" as const,
    icon: "💪",
    labelKey: "diffCerebralPalsy" as const,
  },
  {
    id: "visualImpairment" as const,
    icon: "👁️",
    labelKey: "diffVisualImpairment" as const,
  },
  {
    id: "auditoryProcessing" as const,
    icon: "👂",
    labelKey: "diffAuditoryProcessing" as const,
  },
] as const;
