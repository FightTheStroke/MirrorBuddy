/**
 * Smart collections utilities
 * Date helpers and collection constants
 */

import type { ToolType } from "@/types/tools";

/**
 * Default sort: newest first
 */
export const defaultSort = (
  a: { createdAt: string | Date },
  b: { createdAt: string | Date },
) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/**
 * Start of day (set time to 00:00:00)
 */
export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Start of week (Monday)
 */
export const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Start of month
 */
export const startOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get date N days ago
 */
export const daysAgo = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Type labels for all tool types
 */
export const TYPE_LABELS: Record<ToolType, string> = {
  mindmap: "Mappe Mentali",
  quiz: "Quiz",
  flashcard: "Flashcard",
  summary: "Riassunti",
  demo: "Demo",
  diagram: "Diagrammi",
  timeline: "Timeline",
  formula: "Formule",
  calculator: "Calcolatrici",
  chart: "Grafici",
  pdf: "PDF",
  webcam: "Immagini",
  "webcam-standalone": "Immagini Standalone",
  homework: "Compiti",
  search: "Ricerche",
  typing: "Digitazione",
  "study-kit": "Study Kit",
};

/**
 * All available tool types
 */
export const AVAILABLE_TYPES: ToolType[] = [
  "mindmap",
  "quiz",
  "flashcard",
  "summary",
  "demo",
  "diagram",
  "timeline",
  "formula",
  "calculator",
  "chart",
  "pdf",
  "webcam",
  "homework",
  "search",
  "study-kit",
];
