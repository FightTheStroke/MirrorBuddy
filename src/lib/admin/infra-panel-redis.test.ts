/**
 * Tests for Redis Metrics Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRedisMetrics } from "./infra-panel-redis";

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

describe("getRedisMetrics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return null when Redis is not configured", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const result = await getRedisMetrics();

    expect(result).toBeNull();
  });

  it("should return null when only URL is configured", async () => {
    process.env.KV_REST_API_URL = "https://redis.example.com";
    delete process.env.KV_REST_API_TOKEN;

    const result = await getRedisMetrics();

    expect(result).toBeNull();
  });

  it("should return null when only TOKEN is configured", async () => {
    delete process.env.KV_REST_API_URL;
    process.env.KV_REST_API_TOKEN = "test-token";

    const result = await getRedisMetrics();

    expect(result).toBeNull();
  });

  it("should return null when API call fails", async () => {
    process.env.KV_REST_API_URL = "https://redis.example.com";
    process.env.KV_REST_API_TOKEN = "test-token";

    global.fetch = vi.fn().mockRejectedValue(new Error("Connection error"));

    const result = await getRedisMetrics();

    expect(result).toBeNull();
  });

  it("should return null when API returns non-ok response", async () => {
    process.env.KV_REST_API_URL = "https://redis.example.com";
    process.env.KV_REST_API_TOKEN = "test-token";

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await getRedisMetrics();

    expect(result).toBeNull();
  });

  it("should return real data when Redis is configured and API succeeds", async () => {
    process.env.KV_REST_API_URL = "https://redis.example.com";
    process.env.KV_REST_API_TOKEN = "test-token";

    const mockRedisInfo = `
used_memory:10485760
maxmemory:104857600
db0:keys=100,expires=10
keyspace_hits:950
keyspace_misses:50
total_commands_processed:5000
    `.trim();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockRedisInfo }),
    });

    const result = await getRedisMetrics();

    expect(result).not.toBeNull();
    expect(result?.keysCount).toBe(100);
    expect(result?.status).toBe("healthy");
  });
});
