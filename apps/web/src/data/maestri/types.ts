/**
 * MirrorBuddycation Professori - Type Definitions
 * MaestroFull extends Maestro with tools list and dynamic greeting
 */

import type { Maestro } from "@/types";
import type { GreetingContext } from "@/types/greeting";

export interface MaestroFull extends Maestro {
  tools: string[];
  /** Dynamic greeting generator (optional, language-aware) */
  getGreeting?: (context: GreetingContext) => string;
}

// Re-export safety guidelines from dedicated module
export { SAFETY_GUIDELINES } from "./safety-guidelines";
