/**
 * Robot Device Pairing service.
 *
 * Binds a physical Reachy Mini (MirrorBuddy Robot) to a MirrorBuddy account so
 * the voice-only robot can load the logged-in child's profile without a screen.
 *
 * Security model:
 * - A short-lived 6-digit pairing code is generated for the logged-in user.
 * - The robot redeems the code for a long-lived, revocable device token.
 * - Only SHA-256 hashes of the code and token are ever stored — never plaintext.
 */

import { createHash, randomBytes, randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const CODE_TTL_MS = 10 * 60 * 1000; // pairing code valid for 10 minutes
const CODE_DIGITS = 6;
const MAX_CODE_ATTEMPTS = 5; // retries on the (rare) hashed-code collision
const MAX_LABEL_LEN = 80;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, "0");
}

function generateToken(): string {
  return randomBytes(32).toString("hex"); // 256-bit device token
}

export interface PairingCode {
  code: string;
  expiresAt: Date;
}

export interface DeviceAccessibility {
  fontSize: string;
  highContrast: boolean;
  dyslexiaFont: boolean;
  reducedMotion: boolean;
  simplifiedLanguage: boolean;
  adhdMode: boolean;
  voiceEnabled: boolean;
}

export interface DeviceProfile {
  name: string | null;
  preferredBuddy: string | null;
  preferredCoach: string | null;
  schoolLevel: string | null;
  gradeLevel: string | null;
  age: number | null;
  language: string;
  subjects: string[];
  accessibility: DeviceAccessibility;
}

export interface DeviceSummary {
  id: string;
  label: string | null;
  pairedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
}

/** Generate a fresh pairing code for a user, storing only its hash. */
export async function createPairingCode(
  userId: string,
  label?: string,
): Promise<PairingCode> {
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const safeLabel = label?.trim().slice(0, MAX_LABEL_LEN) || null;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateCode();
    try {
      await prisma.robotDevice.create({
        data: {
          userId,
          label: safeLabel,
          pairCodeHash: sha256(code),
          pairCodeExpiresAt: expiresAt,
        },
      });
      return { code, expiresAt };
    } catch (error) {
      // Retry ONLY on a unique-constraint collision of the hashed code (P2002);
      // surface any other error (DB down, FK violation) immediately.
      const code = (error as { code?: string }).code;
      if (code !== "P2002" || attempt === MAX_CODE_ATTEMPTS - 1) {
        logger.error("Failed to allocate pairing code", undefined, error);
        throw error;
      }
    }
  }
  throw new Error("Unable to allocate pairing code");
}

/** Redeem a pairing code, returning a one-time device token (hash stored). */
export async function redeemPairingCode(
  code: string,
): Promise<{ token: string; deviceId: string } | null> {
  const trimmed = code?.trim();
  if (!trimmed || !/^\d{6}$/.test(trimmed)) return null;

  const token = generateToken();
  const tokenHash = sha256(token);
  const now = new Date();

  // Atomic redemption: a single guarded updateMany claims the code only if it is still
  // unredeemed, unrevoked and unexpired. This closes the double-redeem (TOCTOU) race —
  // concurrent requests for the same code cannot both succeed.
  const claimed = await prisma.robotDevice.updateMany({
    where: {
      pairCodeHash: sha256(trimmed),
      tokenHash: null,
      revokedAt: null,
      pairCodeExpiresAt: { gt: now },
    },
    data: {
      tokenHash,
      pairedAt: now,
      pairCodeHash: null,
      pairCodeExpiresAt: null,
    },
  });
  if (claimed.count === 0) return null;

  const device = await prisma.robotDevice.findUnique({
    where: { tokenHash },
    select: { id: true },
  });
  if (!device) return null;
  logger.info("Robot device paired", { deviceId: device.id });
  return { token, deviceId: device.id };
}

/** Resolve a device token to the owner's robot-facing profile scope. */
export async function getDeviceProfile(
  token: string,
): Promise<DeviceProfile | null> {
  const trimmed = token?.trim();
  if (!trimmed) return null;

  const device = await prisma.robotDevice.findUnique({
    where: { tokenHash: sha256(trimmed) },
    include: { user: { include: { profile: true, settings: true } } },
  });
  if (!device || device.revokedAt) return null;

  await prisma.robotDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  const profile = device.user.profile;
  const settings = device.user.settings;
  return {
    name: profile?.name ?? null,
    preferredBuddy: profile?.preferredBuddy ?? null,
    preferredCoach: profile?.preferredCoach ?? null,
    schoolLevel: profile?.schoolLevel ?? null,
    gradeLevel: profile?.gradeLevel ?? null,
    age: profile?.age ?? null,
    language: settings?.language ?? "it",
    subjects: parseSubjects(profile?.learningGoals),
    accessibility: {
      fontSize: settings?.fontSize ?? "medium",
      highContrast: settings?.highContrast ?? false,
      dyslexiaFont: settings?.dyslexiaFont ?? false,
      reducedMotion: settings?.reducedMotion ?? false,
      simplifiedLanguage: settings?.simplifiedLanguage ?? false,
      adhdMode: settings?.adhdMode ?? false,
      voiceEnabled: settings?.voiceEnabled ?? true,
    },
  };
}

/** List a user's paired devices (no secrets). */
export async function listDevices(userId: string): Promise<DeviceSummary[]> {
  return prisma.robotDevice.findMany({
    where: { userId, revokedAt: null, pairedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      pairedAt: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
}

/** Revoke a device the user owns. Returns false if not found / not theirs. */
export async function revokeDevice(
  userId: string,
  deviceId: string,
): Promise<boolean> {
  const result = await prisma.robotDevice.updateMany({
    where: { id: deviceId, userId, revokedAt: null },
    data: { revokedAt: new Date(), tokenHash: null, pairCodeHash: null },
  });
  return result.count > 0;
}

function parseSubjects(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
