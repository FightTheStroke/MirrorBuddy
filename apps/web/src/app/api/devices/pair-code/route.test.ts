/**
 * Unit tests for POST /api/devices/pair-code.
 * The middleware chain is stubbed; we assert the handler's own behaviour.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/middlewares", () => ({
  pipe:
    (..._mw: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: () => vi.fn(),
  withCSRF: vi.fn(),
  withAuth: vi.fn(),
  withRateLimit: () => vi.fn(),
}));

vi.mock("@/lib/devices/device-service", () => ({
  createPairingCode: vi.fn(),
}));

import { POST } from "./route";
import { createPairingCode } from "@/lib/devices/device-service";

 
const handler = POST as unknown as (ctx: any) => Promise<Response>;
const mockCreate = createPairingCode as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("POST /api/devices/pair-code", () => {
  it("returns the generated code for the authenticated user", async () => {
    const expiresAt = new Date(Date.now() + 60000);
    mockCreate.mockResolvedValue({ code: "123456", expiresAt });

    const res = await handler({
      userId: "user-1",
      req: { json: async () => ({ label: "Cameretta" }) },
    });
    const body = await res.json();

    expect(body.code).toBe("123456");
    expect(body.expiresAt).toBe(expiresAt.toISOString());
    expect(mockCreate).toHaveBeenCalledWith("user-1", "Cameretta");
  });

  it("works without a body (label optional)", async () => {
    mockCreate.mockResolvedValue({ code: "000000", expiresAt: new Date() });

    const res = await handler({
      userId: "user-1",
      req: {
        json: async () => {
          throw new Error("no body");
        },
      },
    });

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith("user-1", undefined);
  });
});