/**
 * Unit tests for GET /api/devices (list) and DELETE /api/devices/[id] (revoke).
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
  listDevices: vi.fn(),
  revokeDevice: vi.fn(),
}));

import { GET } from "./route";
import { DELETE } from "./[id]/route";
import { listDevices, revokeDevice } from "@/lib/devices/device-service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listHandler = GET as unknown as (ctx: any) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deleteHandler = DELETE as unknown as (ctx: any) => Promise<Response>;
const mockList = listDevices as unknown as ReturnType<typeof vi.fn>;
const mockRevoke = revokeDevice as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("GET /api/devices", () => {
  it("lists the user's devices", async () => {
    mockList.mockResolvedValue([{ id: "d1", label: "Robot" }]);

    const res = await listHandler({ userId: "user-1" });
    const body = await res.json();

    expect(body.devices).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith("user-1");
  });
});

describe("DELETE /api/devices/[id]", () => {
  it("revokes an owned device", async () => {
    mockRevoke.mockResolvedValue(true);

    const res = await deleteHandler({
      userId: "user-1",
      params: Promise.resolve({ id: "d1" }),
    });

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockRevoke).toHaveBeenCalledWith("user-1", "d1");
  });

  it("returns 404 when the device is not the user's", async () => {
    mockRevoke.mockResolvedValue(false);

    const res = await deleteHandler({
      userId: "user-1",
      params: Promise.resolve({ id: "other" }),
    });

    expect(res.status).toBe(404);
  });
});