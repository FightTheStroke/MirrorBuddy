/**
 * MIRRORBUDDY - Trial Service Maestri Tests (F-03)
 *
 * Unit tests for maestri assignment and user preferences integration:
 * - selectedMaestri support for trial sessions
 * - Backward compatibility (no userId param)
 * - Random assignment as fallback
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { getOrCreateTrialSession } from "../trial-service";

describe("getOrCreateTrialSession - Maestri Selection (F-03)", () => {
  const mockIp = "192.168.1.1";
  const mockVisitorId = "visitor-xyz-789";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates session with random maestri when userId not provided (backward compatibility)", async () => {
    vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);

    const newSession = {
      id: "session-backward-compat",
      ipHash: "hash-compat",
      visitorId: mockVisitorId,
      chatsUsed: 0,
      docsUsed: 0,
      voiceSecondsUsed: 0,
      toolsUsed: 0,
      assignedMaestri: '["euclide","galileo","darwin"]',
      assignedCoach: "melissa",
    };

    vi.mocked(prisma.trialSession.create).mockResolvedValue(newSession as any);

    const result = await getOrCreateTrialSession(mockIp, mockVisitorId);

    expect(result.id).toBe("session-backward-compat");
    expect(result.assignedMaestri).toBeDefined();
    const maestri = JSON.parse(result.assignedMaestri);
    expect(maestri).toHaveLength(3);
  });

  it("returns existing trial session without querying user preferences", async () => {
    const existingSession = {
      id: "session-existing",
      ipHash: "hash-existing",
      visitorId: mockVisitorId,
      chatsUsed: 2,
      docsUsed: 0,
      voiceSecondsUsed: 100,
      toolsUsed: 1,
      assignedMaestri: '["mozart","socrate","omero"]',
      assignedCoach: "laura",
    };

    vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(
      existingSession as any,
    );

    const result = await getOrCreateTrialSession(mockIp, mockVisitorId);

    expect(result).toEqual(existingSession);
    expect(prisma.trialSession.findFirst).toHaveBeenCalledTimes(1);
  });

  it("assigns exactly 3 maestri on new session creation", async () => {
    vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);

    const newSession = {
      id: "session-exact-3",
      ipHash: "hash-exact",
      visitorId: mockVisitorId,
      chatsUsed: 0,
      docsUsed: 0,
      voiceSecondsUsed: 0,
      toolsUsed: 0,
      assignedMaestri: '["curie","feynman","darwin"]',
      assignedCoach: "melissa",
    };

    vi.mocked(prisma.trialSession.create).mockResolvedValue(newSession as any);

    await getOrCreateTrialSession(mockIp, mockVisitorId);

    const createCall = vi.mocked(prisma.trialSession.create).mock.calls[0][0];
    const maestriJson = createCall.data.assignedMaestri as string;
    const maestri = JSON.parse(maestriJson);

    expect(maestri).toHaveLength(3);
  });

  it("assigns a single coach to new session", async () => {
    vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);

    const newSession = {
      id: "session-coach",
      ipHash: "hash-coach",
      visitorId: mockVisitorId,
      chatsUsed: 0,
      docsUsed: 0,
      voiceSecondsUsed: 0,
      toolsUsed: 0,
      assignedMaestri: '["euclide","galileo","darwin"]',
      assignedCoach: "laura",
    };

    vi.mocked(prisma.trialSession.create).mockResolvedValue(newSession as any);

    await getOrCreateTrialSession(mockIp, mockVisitorId);

    const createCall = vi.mocked(prisma.trialSession.create).mock.calls[0][0];
    expect(createCall.data.assignedCoach).toBeDefined();
    expect(typeof createCall.data.assignedCoach).toBe("string");
  });

  it("F-03: uses user-selected maestri when userId provided and user has selections", async () => {
    const userId = "user-123";
    const userSelectedMaestri = ["euclide", "curie", "feynman", "galileo"];

    vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      selectedMaestri: userSelectedMaestri,
    } as any);

    const newSession = {
      id: "session-with-selections",
      ipHash: "hash-selections",
      visitorId: mockVisitorId,
      chatsUsed: 0,
      docsUsed: 0,
      voiceSecondsUsed: 0,
      toolsUsed: 0,
      assignedMaestri: '["euclide","curie","feynman"]',
      assignedCoach: "melissa",
    };

    vi.mocked(prisma.trialSession.create).mockResolvedValue(newSession as any);

    await getOrCreateTrialSession(mockIp, mockVisitorId, userId);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { selectedMaestri: true },
    });

    const createCall = vi.mocked(prisma.trialSession.create).mock.calls[0][0];
    const maestriJson = createCall.data.assignedMaestri as string;
    const maestri = JSON.parse(maestriJson);

    expect(maestri).toHaveLength(3);
    expect(maestri).toEqual(["euclide", "curie", "feynman"]);
  });

  it("F-03: uses random maestri when userId provided but user has no selections", async () => {
    const userId = "user-456";

    vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      selectedMaestri: [],
    } as any);

    const newSession = {
      id: "session-no-selections",
      ipHash: "hash-no-selections",
      visitorId: mockVisitorId,
      chatsUsed: 0,
      docsUsed: 0,
      voiceSecondsUsed: 0,
      toolsUsed: 0,
      assignedMaestri: '["darwin","mozart","socrate"]',
      assignedCoach: "laura",
    };

    vi.mocked(prisma.trialSession.create).mockResolvedValue(newSession as any);

    await getOrCreateTrialSession(mockIp, mockVisitorId, userId);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { selectedMaestri: true },
    });

    expect(prisma.trialSession.create).toHaveBeenCalled();
    const createCall = vi.mocked(prisma.trialSession.create).mock.calls[0][0];
    const maestriJson = createCall.data.assignedMaestri as string;
    const maestri = JSON.parse(maestriJson);

    expect(maestri).toHaveLength(3);
    maestri.forEach((m: string) => {
      expect(typeof m).toBe("string");
      expect(m.length).toBeGreaterThan(0);
    });
  });

  it("F-03: uses random maestri when userId provided but user not found", async () => {
    const userId = "user-nonexistent";

    vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const newSession = {
      id: "session-user-not-found",
      ipHash: "hash-not-found",
      visitorId: mockVisitorId,
      chatsUsed: 0,
      docsUsed: 0,
      voiceSecondsUsed: 0,
      toolsUsed: 0,
      assignedMaestri: '["leonardo","manzoni","ippocrate"]',
      assignedCoach: "melissa",
    };

    vi.mocked(prisma.trialSession.create).mockResolvedValue(newSession as any);

    await getOrCreateTrialSession(mockIp, mockVisitorId, userId);

    expect(prisma.user.findUnique).toHaveBeenCalled();

    const createCall = vi.mocked(prisma.trialSession.create).mock.calls[0][0];
    const maestriJson = createCall.data.assignedMaestri as string;
    const maestri = JSON.parse(maestriJson);

    expect(maestri).toHaveLength(3);
  });
});
