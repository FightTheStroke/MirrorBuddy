/**
 * Maestri ID Mapping and System Prompt Helper
 * After migration to unified system, IDs are short (identity mapping).
 * This module remains for backwards compatibility during transition.
 */

import { getMaestroById } from "./maestri";
import { logger } from "@/lib/logger";

export function getFullSystemPrompt(shortId: string): string {
  const maestro = getMaestroById(shortId);
  if (!maestro) {
    logger.warn("Maestro not found", { shortId });
    return "";
  }
  return maestro.systemPrompt;
}
