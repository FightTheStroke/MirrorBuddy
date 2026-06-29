import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSendWebcamResult } from "../actions";

vi.mock("@/lib/logger/client", () => ({
  clientLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("useSendWebcamResult", () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let channelRef: React.MutableRefObject<RTCDataChannel | null>;

  beforeEach(() => {
    mockSend = vi.fn();
    channelRef = {
      current: { readyState: "open", send: mockSend } as unknown as RTCDataChannel,
    };
  });

  it("on capture: resolves the tool call and sends the photo as input_image", () => {
    const { result } = renderHook(() => useSendWebcamResult(channelRef));

    result.current("call-1", "data:image/jpeg;base64,AAAA");

    const msgs = mockSend.mock.calls.map((c) => JSON.parse(c[0]));

    // 1. function_call_output unblocks the realtime model
    const output = msgs.find(
      (m) => m.item?.type === "function_call_output",
    );
    expect(output.item.call_id).toBe("call-1");
    expect(JSON.parse(output.item.output).success).toBe(true);

    // 2. the captured image is sent so the model can inspect the homework
    const imageMsg = msgs.find((m) =>
      m.item?.content?.some(
        (c: { type: string }) => c.type === "input_image",
      ),
    );
    expect(imageMsg).toBeDefined();
    const image = imageMsg.item.content.find(
      (c: { type: string }) => c.type === "input_image",
    );
    expect(image.image_url).toBe("data:image/jpeg;base64,AAAA");

    // 3. a response is requested
    expect(msgs.some((m) => m.type === "response.create")).toBe(true);
  });

  it("normalizes a raw base64 string into a data URL", () => {
    const { result } = renderHook(() => useSendWebcamResult(channelRef));

    result.current("call-2", "AAAA");

    const imageMsg = mockSend.mock.calls
      .map((c) => JSON.parse(c[0]))
      .find((m) =>
        m.item?.content?.some((c: { type: string }) => c.type === "input_image"),
      );
    const image = imageMsg.item.content.find(
      (c: { type: string }) => c.type === "input_image",
    );
    expect(image.image_url).toBe("data:image/jpeg;base64,AAAA");
  });

  it("on cancel: reports failure and still requests a response (no image)", () => {
    const { result } = renderHook(() => useSendWebcamResult(channelRef));

    result.current("call-3", null);

    const msgs = mockSend.mock.calls.map((c) => JSON.parse(c[0]));
    const output = msgs.find((m) => m.item?.type === "function_call_output");
    expect(JSON.parse(output.item.output).success).toBe(false);
    expect(
      msgs.some((m) =>
        m.item?.content?.some((c: { type: string }) => c.type === "input_image"),
      ),
    ).toBe(false);
    expect(msgs.some((m) => m.type === "response.create")).toBe(true);
  });
});
