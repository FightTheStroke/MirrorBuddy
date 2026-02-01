/**
 * Character Management Admin API
 * GET /api/admin/characters - List all characters with their config
 * Aggregates maestri, coaches, and buddies from data files
 * and joins with CharacterConfig from database
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { getAllMaestri } from "@/data/maestri";
import { getAllSupportTeachers } from "@/data/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles";

interface CharacterWithConfig {
  id: string;
  name: string;
  displayName: string;
  type: "MAESTRO" | "COACH" | "BUDDY";
  isEnabled: boolean;
  avatar: string;
  subject?: string;
  color: string;
  tools: string[];
  displayNameOverride?: string | null;
  descriptionOverride?: string | null;
  configId?: string;
}

/**
 * GET /api/admin/characters
 * Returns all characters (26 maestri + 6 coaches + 6 buddies = 38 total)
 * with their configuration from CharacterConfig table
 */
export const GET = pipe(
  withSentry("/api/admin/characters"),
  withAdmin,
)(async () => {
  // Fetch all character configs from database
  const configs = await prisma.characterConfig.findMany();
  const configMap = new Map(configs.map((c) => [c.characterId, c]));

  const characters: CharacterWithConfig[] = [];

  // 1. Add all maestri (26 characters)
  const maestri = getAllMaestri();
  for (const maestro of maestri) {
    const config = configMap.get(maestro.id);
    characters.push({
      id: maestro.id,
      name: maestro.name,
      displayName: maestro.displayName,
      type: "MAESTRO",
      isEnabled: config?.isEnabled ?? true,
      avatar: maestro.avatar,
      subject: maestro.subject,
      color: maestro.color,
      tools: maestro.tools,
      displayNameOverride: config?.displayNameOverride,
      descriptionOverride: config?.descriptionOverride,
      configId: config?.id,
    });
  }

  // 2. Add all coaches (6 characters)
  const coaches = getAllSupportTeachers();
  for (const coach of coaches) {
    const config = configMap.get(coach.id);
    characters.push({
      id: coach.id,
      name: coach.name,
      displayName: coach.name, // Coaches use name as displayName
      type: "COACH",
      isEnabled: config?.isEnabled ?? true,
      avatar: coach.avatar,
      color: coach.color,
      tools: coach.tools,
      displayNameOverride: config?.displayNameOverride,
      descriptionOverride: config?.descriptionOverride,
      configId: config?.id,
    });
  }

  // 3. Add all buddies (6 characters)
  const buddies = getAllBuddies();
  for (const buddy of buddies) {
    const config = configMap.get(buddy.id);
    characters.push({
      id: buddy.id,
      name: buddy.name,
      displayName: buddy.name, // Buddies use name as displayName
      type: "BUDDY",
      isEnabled: config?.isEnabled ?? true,
      avatar: buddy.avatar,
      color: buddy.color,
      tools: buddy.tools,
      displayNameOverride: config?.displayNameOverride,
      descriptionOverride: config?.descriptionOverride,
      configId: config?.id,
    });
  }

  return NextResponse.json({ characters });
});
