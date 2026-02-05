import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSendVideoFrame } from "../actions";

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

describe("useSendVideoFrame", () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let channelRef: React.MutableRefObject<RTCDataChannel | null>;

  beforeEach(() => {
    mockSend = vi.fn();
    channelRef = {
      current: {
        readyState: "open",
        send: mockSend,
      } as unknown as RTCDataChannel,
    };
  });

  it("should send conversation.item.create with input_image", () => {
    const { result } = renderHook(() => useSendVideoFrame(channelRef));

    const sent = result.current("dGVzdEltYWdl");

    expect(sent).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(mockSend.mock.calls[0][0]);
    expect(parsed.type).toBe("conversation.item.create");
    expect(parsed.item.type).toBe("message");
    expect(parsed.item.role).toBe("user");
    expect(parsed.item.content[0].type).toBe("input_image");
    expect(parsed.item.content[0].image_url).toContain(
      "data:image/jpeg;base64,dGVzdEltYWdl",
    );
  });

  it("should return false when data channel is closed", () => {
    channelRef.current = {
      readyState: "closed",
      send: mockSend,
    } as unknown as RTCDataChannel;

    const { result } = renderHook(() => useSendVideoFrame(channelRef));
    const sent = result.current("dGVzdA==");

    expect(sent).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("should return false when data channel is null", () => {
    channelRef.current = null;

    const { result } = renderHook(() => useSendVideoFrame(channelRef));
    const sent = result.current("dGVzdA==");

    expect(sent).toBe(false);
  });
});
