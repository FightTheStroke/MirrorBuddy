/**
 * Unit tests for POST /api/devices/pair (robot redeems a pairing code).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/middlewares", () => ({
  pipe:
    (..._mw: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: () => vi.fn(),
  withRateLimit: () => vi.fn(),
}));

vi.mock("@/lib/devices/device-service", () => ({
  redeemPairingCode: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: { DEVICE_PAIR: {}, DEVICE_PAIR_GLOBAL: {} },
  checkRateLimitAsync: vi.fn(),
}));

import { POST } from "./route";
import { redeemPairingCode } from "@/lib/devices/device-service";
import { checkRateLimitAsync } from "@/lib/rate-limit";

 
const handler = POST as unknown as (ctx: any) => Promise<Response>;
const mockRedeem = redeemPairingCode as unknown as ReturnType<typeof vi.fn>;
const mockGlobal = checkRateLimitAsync as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGlobal.mockResolvedValue({ success: true });
});

describe("POST /api/devices/pair", () => {
  it("returns a device token for a valid code", async () => {
    mockRedeem.mockResolvedValue({ token: "a".repeat(64), deviceId: "d1" });

    const res = await handler({ req: { json: async () => ({ code: "123456" }) } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.token).toBe("a".repeat(64));
    expect(body.deviceId).toBe("d1");
    expect(mockRedeem).toHaveBeenCalledWith("123456");
  });

  it("returns 400 for an invalid or expired code", async () => {
    mockRedeem.mockResolvedValue(null);

    const res = await handler({ req: { json: async () => ({ code: "000000" }) } });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid/i);
  });

  it("returns 400 when the body is missing", async () => {
    mockRedeem.mockResolvedValue(null);

    const res = await handler({
      req: {
        json: async () => {
          throw new Error("no body");
        },
      },
    });

    expect(res.status).toBe(400);
    expect(mockRedeem).toHaveBeenCalledWith("");
  });

  it("returns 429 when the global brute-force ceiling is hit", async () => {
    mockGlobal.mockResolvedValue({ success: false });

    const res = await handler({ req: { json: async () => ({ code: "123456" }) } });

    expect(res.status).toBe(429);
    expect(mockRedeem).not.toHaveBeenCalled();
  });
});