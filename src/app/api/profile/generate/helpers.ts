/**
 * Profile generation helpers
 */

import type { MaestroInsightInput } from "@/lib/profile/profile-generator";
import type { ObservationCategory } from "@/types";

/**
 * Maps maestro ID to display name
 */
export function getMaestroDisplayName(maestroId: string): string {
  const names: Record<string, string> = {
    euclide: "Euclide",
    feynman: "Richard Feynman",
    curie: "Marie Curie",
    darwin: "Charles Darwin",
    erodoto: "Erodoto",
    humboldt: "Alexander von Humboldt",
    manzoni: "Alessandro Manzoni",
    shakespeare: "William Shakespeare",
    leonardo: "Leonardo da Vinci",
    mozart: "Wolfgang Mozart",
    cicerone: "Marco Tullio Cicerone",
    smith: "Adam Smith",
    socrate: "Socrate",
    lovelace: "Ada Lovelace",
    ippocrate: "Ippocrate",
    chris: "Chris",
    omero: "Omero",
    "alex-pina": "Álex Pina",
    mascetti: "Conte Mascetti",
    simone: "Simone Barlaam",
    cassese: "Antonio Cassese",
    moliere: "Molière",
    goethe: "Goethe",
    cervantes: "Cervantes",
    "levi-montalcini": "Rita Levi-Montalcini",
  };
  // Support both new short IDs and old long IDs (backwards compat)
  if (names[maestroId]) return names[maestroId];
  const shortId = Object.keys(names).find((key) =>
    maestroId.startsWith(key + "-"),
  );
  return shortId ? names[shortId] : maestroId;
}

/**
 * Maps Learning category to ObservationCategory
 */
export function mapCategoryFromLearning(category: string): ObservationCategory {
  const mapping: Record<string, ObservationCategory> = {
    math: "logical_reasoning",
    mathematics: "logical_reasoning",
    logic: "logical_reasoning",
    physics: "scientific_curiosity",
    chemistry: "experimental_approach",
    biology: "scientific_curiosity",
    history: "historical_understanding",
    geography: "spatial_memory",
    italian: "linguistic_ability",
    english: "linguistic_ability",
    art: "artistic_sensitivity",
    music: "artistic_sensitivity",
    philosophy: "philosophical_depth",
    study_method: "study_method",
    organization: "study_method",
    expression: "verbal_expression",
    creativity: "creativity",
    collaboration: "collaborative_spirit",
  };

  return mapping[category.toLowerCase()] || "study_method";
}

/**
 * Calculates overall confidence score for the profile
 */
export function calculateConfidenceScore(
  insights: MaestroInsightInput[],
): number {
  if (insights.length === 0) return 0;

  const quantityScore = Math.min(insights.length / 20, 1) * 0.4;

  const avgConfidence =
    insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  const qualityScore = avgConfidence * 0.4;

  const uniqueMaestri = new Set(insights.map((i) => i.maestroId)).size;
  const diversityScore = Math.min(uniqueMaestri / 5, 1) * 0.2;

  return quantityScore + qualityScore + diversityScore;
}

/**
 * Check if profile is up to date
 */
export function isProfileUpToDate(
  updatedAt: Date,
  hoursThreshold: number = 24,
): boolean {
  const hoursSinceUpdate =
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate < hoursThreshold;
}
