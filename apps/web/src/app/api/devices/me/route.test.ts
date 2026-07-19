/**
 * Unit tests for GET /api/devices/me (robot fetches profile via device token).
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
  getDeviceProfile: vi.fn(),
}));

import { GET } from "./route";
import { getDeviceProfile } from "@/lib/devices/device-service";

 
const handler = GET as unknown as (ctx: any) => Promise<Response>;
const mockProfile = getDeviceProfile as unknown as ReturnType<typeof vi.fn>;

function ctxWith(auth?: string) {
  return { req: { headers: new Headers(auth ? { authorization: auth } : {}) } };
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/devices/me", () => {
  it("returns 401 when the bearer token is missing", async () => {
    const res = await handler(ctxWith());
    expect(res.status).toBe(401);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", async () => {
    mockProfile.mockResolvedValue(null);
    const res = await handler(ctxWith("Bearer bad"));
    expect(res.status).toBe(401);
  });

  it("returns the profile for a valid device token", async () => {
    mockProfile.mockResolvedValue({ name: "Mario", preferredBuddy: "sofia" });

    const res = await handler(ctxWith("Bearer good-token"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.profile.name).toBe("Mario");
    expect(mockProfile).toHaveBeenCalledWith("good-token");
  });
});