/**
 * Unit tests for device-service (robot pairing).
 * TDD: behaviour specified before wiring the routes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const { createMockPrisma } = await import("@/test/mocks/prisma");
  return { prisma: createMockPrisma() };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { prisma } from "@/lib/db";
import {
  createPairingCode,
  redeemPairingCode,
  getDeviceProfile,
  listDevices,
  revokeDevice,
} from "../device-service";

 
const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPairingCode", () => {
  it("stores a hashed code and returns a 6-digit code with future expiry", async () => {
    db.robotDevice.create.mockResolvedValue({ id: "d1" });

    const result = await createPairingCode("user-1", "Cameretta");

    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    const data = db.robotDevice.create.mock.calls[0][0].data;
    expect(data.userId).toBe("user-1");
    expect(data.label).toBe("Cameretta");
    expect(data.pairCodeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.pairCodeHash).not.toContain(result.code);
  });

  it("retries on a hashed-code collision (P2002)", async () => {
    const collision = Object.assign(new Error("unique"), { code: "P2002" });
    db.robotDevice.create
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({ id: "d2" });

    const result = await createPairingCode("user-1");

    expect(result.code).toMatch(/^\d{6}$/);
    expect(db.robotDevice.create).toHaveBeenCalledTimes(2);
  });

  it("surfaces a non-collision error immediately without retrying", async () => {
    db.robotDevice.create.mockRejectedValue(new Error("db down"));

    await expect(createPairingCode("user-1")).rejects.toThrow("db down");
    expect(db.robotDevice.create).toHaveBeenCalledTimes(1);
  });
});

describe("redeemPairingCode", () => {
  it("rejects a malformed code without hitting the database", async () => {
    expect(await redeemPairingCode("abc")).toBeNull();
    expect(db.robotDevice.updateMany).not.toHaveBeenCalled();
  });

  it("returns null when no redeemable code matches (unknown/expired/already-paired)", async () => {
    db.robotDevice.updateMany.mockResolvedValue({ count: 0 });
    expect(await redeemPairingCode("123456")).toBeNull();
    // The guard lives in the atomic updateMany where-clause.
    const where = db.robotDevice.updateMany.mock.calls[0][0].where;
    expect(where.tokenHash).toBeNull();
    expect(where.revokedAt).toBeNull();
    expect(where.pairCodeExpiresAt.gt).toBeInstanceOf(Date);
  });

  it("issues a token atomically and clears the code on success", async () => {
    db.robotDevice.updateMany.mockResolvedValue({ count: 1 });
    db.robotDevice.findUnique.mockResolvedValue({ id: "d1" });

    const result = await redeemPairingCode("123456");

    expect(result?.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result?.deviceId).toBe("d1");
    const data = db.robotDevice.updateMany.mock.calls[0][0].data;
    expect(data.pairCodeHash).toBeNull();
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).not.toBe(result?.token);
  });

  it("returns null if the claimed row cannot be read back", async () => {
    db.robotDevice.updateMany.mockResolvedValue({ count: 1 });
    db.robotDevice.findUnique.mockResolvedValue(null);
    expect(await redeemPairingCode("123456")).toBeNull();
  });
});

describe("getDeviceProfile", () => {
  it("returns null for an unknown token", async () => {
    db.robotDevice.findUnique.mockResolvedValue(null);
    expect(await getDeviceProfile("tok")).toBeNull();
  });

  it("returns null for a revoked device", async () => {
    db.robotDevice.findUnique.mockResolvedValue({
      id: "d1",
      revokedAt: new Date(),
      user: { profile: null, settings: null },
    });
    expect(await getDeviceProfile("tok")).toBeNull();
  });

  it("maps profile + settings and refreshes lastSeenAt", async () => {
    db.robotDevice.findUnique.mockResolvedValue({
      id: "d1",
      revokedAt: null,
      user: {
        profile: {
          name: "Mario",
          preferredBuddy: "sofia",
          preferredCoach: "roberto",
          schoolLevel: "superiore",
          gradeLevel: "2",
          age: 15,
          learningGoals: '["matematica","storia"]',
        },
        settings: { language: "it", dyslexiaFont: true, adhdMode: true },
      },
    });
    db.robotDevice.update.mockResolvedValue({});

    const profile = await getDeviceProfile("tok");

    expect(profile?.name).toBe("Mario");
    expect(profile?.preferredBuddy).toBe("sofia");
    expect(profile?.subjects).toEqual(["matematica", "storia"]);
    expect(profile?.language).toBe("it");
    expect(profile?.accessibility.dyslexiaFont).toBe(true);
    expect(profile?.accessibility.adhdMode).toBe(true);
    expect(db.robotDevice.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { lastSeenAt: expect.any(Date) },
    });
  });
});

describe("listDevices / revokeDevice", () => {
  it("lists a user's active devices", async () => {
    db.robotDevice.findMany.mockResolvedValue([{ id: "d1", label: "Robot" }]);
    const devices = await listDevices("user-1");
    expect(devices).toHaveLength(1);
    expect(db.robotDevice.findMany.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      revokedAt: null,
      pairedAt: { not: null },
    });
  });

  it("returns true when a device is revoked", async () => {
    db.robotDevice.updateMany.mockResolvedValue({ count: 1 });
    expect(await revokeDevice("user-1", "d1")).toBe(true);
  });

  it("returns false when nothing is revoked", async () => {
    db.robotDevice.updateMany.mockResolvedValue({ count: 0 });
    expect(await revokeDevice("user-1", "d1")).toBe(false);
  });
});
