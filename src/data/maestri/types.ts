/**
 * MirrorBuddycation Professori - Type Definitions
 * Auto-generated from CLI markdown files
 */

import type { GreetingContext } from "@/types/greeting";

export interface MaestroFull {
  id: string; // from filename, e.g., "euclide-matematica"
  name: string; // from frontmatter
  displayName: string; // Human readable, e.g., "Euclide"
  subject: string; // e.g., "mathematics", "history", etc.
  tools: string[]; // from frontmatter
  systemPrompt: string; // full markdown content after frontmatter
  avatar: string; // `/maestri/${id}.webp`
  color: string; // subject-based color
  greeting: string; // Static fallback greeting (Italian)
  /** Dynamic greeting generator (optional, language-aware) */
  getGreeting?: (context: GreetingContext) => string;
  excludeFromGamification?: boolean; // If true, sessions don't earn XP
}

// Re-export safety guidelines from dedicated module
export { SAFETY_GUIDELINES } from "./safety-guidelines";
