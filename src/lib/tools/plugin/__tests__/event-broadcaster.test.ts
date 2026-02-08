/**
 * Tests for ToolEventBroadcaster
 * Ensures dual-path event delivery works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ToolEventBroadcaster,
  createToolEventBroadcaster,
} from "../event-broadcaster";
import {
  ToolEventType,
  type ToolDataChannelMessage,
} from "../data-channel-protocol";
import type { ToolDataChannelSender } from "../data-channel-sender";

// Mock logger
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

// Mock csrfFetch for SSE fallback (the code uses csrfFetch, not raw fetch)
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

describe("ToolEventBroadcaster", () => {
  let mockSender: ToolDataChannelSender;
  let mockEvent: ToolDataChannelMessage;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSender = {
      sendEvent: vi.fn().mockReturnValue(true),
      isConnected: vi.fn().mockReturnValue(true),
    } as unknown as ToolDataChannelSender;

    mockEvent = {
      type: ToolEventType.TOOL_EXECUTING,
      toolId: "test-tool-123",
      toolType: "mindmap",
      maestroId: "test-maestro",
      sessionId: "session-123",
      timestamp: Date.now(),
      payload: { progress: 50 },
    };

    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create broadcaster without sender", () => {
      const broadcaster = new ToolEventBroadcaster();
      expect(broadcaster.isUsingDataChannel()).toBe(false);
    });

    it("should create broadcaster with sender", () => {
      const broadcaster = new ToolEventBroadcaster(mockSender);
      expect(broadcaster.isUsingDataChannel()).toBe(true);
    });

    it("should create broadcaster with session ID", () => {
      const broadcaster = new ToolEventBroadcaster(null, "session-123");
      expect(broadcaster.getDeliveryMode()).toBe("sse");
    });
  });

  describe("sendEvent", () => {
    it("should send event via DataChannel when connected", () => {
      const broadcaster = new ToolEventBroadcaster(mockSender);
      const result = broadcaster.sendEvent(mockEvent);

      expect(result).toBe(true);
      expect(mockSender.sendEvent).toHaveBeenCalledWith(mockEvent);
    });

    it("should fallback to SSE when DataChannel not available", async () => {
      const broadcaster = new ToolEventBroadcaster(null, "session-123");
      const result = broadcaster.sendEvent(mockEvent);

      expect(result).toBe(false);

      // Wait for async SSE fallback (csrfFetch handles headers internally)
      await vi.waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalledWith(
          "/api/tools/events",
          expect.objectContaining({
            method: "POST",
          }),
        );
      });
    });

    it("should fallback to SSE when DataChannel send fails", async () => {
      (mockSender.sendEvent as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const broadcaster = new ToolEventBroadcaster(mockSender, "session-123");
      const result = broadcaster.sendEvent(mockEvent);

      expect(result).toBe(false);

      await vi.waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalled();
      });
    });

    it("should handle SSE fallback failure gracefully", async () => {
      mockCsrfFetch.mockResolvedValue({ ok: false, status: 500 });
      const broadcaster = new ToolEventBroadcaster(null, "session-123");

      broadcaster.sendEvent(mockEvent);

      await vi.waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalled();
      });
    });

    it("should handle SSE network error gracefully", async () => {
      mockCsrfFetch.mockRejectedValue(new Error("Network error"));
      const broadcaster = new ToolEventBroadcaster(null, "session-123");

      broadcaster.sendEvent(mockEvent);

      await vi.waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalled();
      });
    });
  });

  describe("setDataChannelSender", () => {
    it("should update sender", () => {
      const broadcaster = new ToolEventBroadcaster();
      expect(broadcaster.isUsingDataChannel()).toBe(false);

      broadcaster.setDataChannelSender(mockSender);
      expect(broadcaster.isUsingDataChannel()).toBe(true);
    });

    it("should allow clearing sender", () => {
      const broadcaster = new ToolEventBroadcaster(mockSender);
      expect(broadcaster.isUsingDataChannel()).toBe(true);

      broadcaster.setDataChannelSender(null);
      expect(broadcaster.isUsingDataChannel()).toBe(false);
    });
  });

  describe("setSessionId", () => {
    it("should set session ID for SSE fallback", async () => {
      const broadcaster = new ToolEventBroadcaster();
      broadcaster.setSessionId("new-session-456");
      const eventWithSession = {
        ...mockEvent,
        sessionId: undefined,
      };
      broadcaster.sendEvent(eventWithSession);

      await vi.waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalledWith(
          "/api/tools/events",
          expect.objectContaining({
            body: expect.stringContaining("new-session-456"),
          }),
        );
      });
    });
  });

  describe("isUsingDataChannel", () => {
    it("should return false when no sender", () => {
      const broadcaster = new ToolEventBroadcaster();
      expect(broadcaster.isUsingDataChannel()).toBe(false);
    });

    it("should return false when sender not connected", () => {
      (mockSender.isConnected as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      const broadcaster = new ToolEventBroadcaster(mockSender);
      expect(broadcaster.isUsingDataChannel()).toBe(false);
    });

    it("should return true when sender connected", () => {
      const broadcaster = new ToolEventBroadcaster(mockSender);
      expect(broadcaster.isUsingDataChannel()).toBe(true);
    });
  });

  describe("getDeliveryMode", () => {
    it("should return dataChannel when using DataChannel", () => {
      const broadcaster = new ToolEventBroadcaster(mockSender);
      expect(broadcaster.getDeliveryMode()).toBe("dataChannel");
    });

    it("should return sse when not using DataChannel", () => {
      const broadcaster = new ToolEventBroadcaster();
      expect(broadcaster.getDeliveryMode()).toBe("sse");
    });
  });

  describe("broadcast", () => {
    it("should call sendEvent", () => {
      const broadcaster = new ToolEventBroadcaster(mockSender);
      const sendEventSpy = vi.spyOn(broadcaster, "sendEvent");

      broadcaster.broadcast(mockEvent);

      expect(sendEventSpy).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("createToolEventBroadcaster factory", () => {
    it("should create broadcaster without arguments", () => {
      const broadcaster = createToolEventBroadcaster();
      expect(broadcaster).toBeInstanceOf(ToolEventBroadcaster);
      expect(broadcaster.isUsingDataChannel()).toBe(false);
    });

    it("should create broadcaster with sender", () => {
      const broadcaster = createToolEventBroadcaster(mockSender);
      expect(broadcaster.isUsingDataChannel()).toBe(true);
    });

    it("should create broadcaster with null sender and session ID", () => {
      const broadcaster = createToolEventBroadcaster(null, "session-789");
      expect(broadcaster.getDeliveryMode()).toBe("sse");
    });
  });
});
