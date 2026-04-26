import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGrafanaConfig, getGrafanaPanels } from "./grafana-embed-service";

describe("grafana-embed-service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
  });

  describe("getGrafanaConfig", () => {
    it("should return configured:false when GRAFANA_CLOUD_PROMETHEUS_URL is not set", async () => {
      delete process.env.GRAFANA_CLOUD_PROMETHEUS_URL;

      const config = await getGrafanaConfig();

      expect(config).toEqual({
        configured: false,
        reachable: false,
        dashboardUrl: null,
        orgSlug: null,
      });
    });

    it("should return configured:true, reachable:true when URL is set and Grafana is reachable", async () => {
      process.env.GRAFANA_CLOUD_PROMETHEUS_URL =
        "https://prometheus-prod-01-eu-west.grafana.net/api/prom/push";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      const config = await getGrafanaConfig();

      expect(config.configured).toBe(true);
      expect(config.reachable).toBe(true);
      expect(config.orgSlug).toBe("prometheus-prod-01-eu-west");
      expect(config.dashboardUrl).toContain("grafana.net");
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return configured:true, reachable:false when URL is set but Grafana is unreachable", async () => {
      process.env.GRAFANA_CLOUD_PROMETHEUS_URL =
        "https://prometheus-prod-01-eu-west.grafana.net/api/prom/push";

      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const config = await getGrafanaConfig();

      expect(config.configured).toBe(true);
      expect(config.reachable).toBe(false);
      expect(config.orgSlug).toBe("prometheus-prod-01-eu-west");
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return configured:true, reachable:false when Grafana returns non-2xx status", async () => {
      process.env.GRAFANA_CLOUD_PROMETHEUS_URL =
        "https://prometheus-prod-01-eu-west.grafana.net/api/prom/push";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      global.fetch = mockFetch;

      const config = await getGrafanaConfig();

      expect(config.configured).toBe(true);
      expect(config.reachable).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("getGrafanaPanels", () => {
    it("should return array of panels", async () => {
      const panels = await getGrafanaPanels();

      expect(Array.isArray(panels)).toBe(true);
      expect(panels.length).toBeGreaterThan(0);
      panels.forEach((panel) => {
        expect(panel).toHaveProperty("id");
        expect(panel).toHaveProperty("title");
        expect(panel).toHaveProperty("embedUrl");
        expect(panel).toHaveProperty("height");
      });
    });
  });
});
