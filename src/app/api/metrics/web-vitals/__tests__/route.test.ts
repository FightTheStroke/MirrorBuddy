/**
 * Unit tests for Web Vitals API Endpoint (F-05)
 * Tests valid payload acceptance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock logger with child method for rate-limit.ts
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock Buffer.from for base64 encoding
if (typeof Buffer === 'undefined') {
  global.Buffer = {
    from: (str: string) => ({
      toString: (_encoding: string) => str,
    }),
  } as any;
}

describe('POST /api/metrics/web-vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GRAFANA_CLOUD_PROMETHEUS_URL = 'https://prometheus.grafana.com/api/v1/write';
    process.env.GRAFANA_CLOUD_PROMETHEUS_USER = 'test-user';
    process.env.GRAFANA_CLOUD_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GRAFANA_CLOUD_PROMETHEUS_URL;
    delete process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
    delete process.env.GRAFANA_CLOUD_API_KEY;
  });

  // ============================================================================
  // VALID PAYLOAD
  // ============================================================================

  describe('Valid Payload', () => {
    it('should accept valid web vitals payload', async () => {
      const payload = {
        metrics: [
          {
            name: 'LCP',
            value: 2500,
            rating: 'good',
            route: '/dashboard',
            deviceType: 'desktop',
            connectionType: '4g',
          },
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'success',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('count', 1);
    });

    it('should accept multiple metrics in single request', async () => {
      const payload = {
        metrics: [
          {
            name: 'LCP',
            value: 2500,
            rating: 'good',
            route: '/dashboard',
            deviceType: 'desktop',
          },
          {
            name: 'CLS',
            value: 0.1,
            rating: 'good',
            route: '/dashboard',
            deviceType: 'desktop',
          },
          {
            name: 'INP',
            value: 150,
            rating: 'good',
            route: '/dashboard',
            deviceType: 'mobile',
          },
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'success',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.count).toBe(3);
    });

    it('should accept optional userId field', async () => {
      const payload = {
        metrics: [
          {
            name: 'LCP',
            value: 2500,
            rating: 'good',
            route: '/dashboard',
            deviceType: 'desktop',
            userId: 'user-123',
          },
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'success',
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it('should accept all metric names', async () => {
      const metricNames = ['LCP', 'CLS', 'INP', 'TTFB', 'FCP'];

      for (const name of metricNames) {
        const payload = {
          metrics: [
            {
              name,
              value: 100,
              rating: 'good',
              route: '/test',
              deviceType: 'desktop',
            },
          ],
        };

        const request = new NextRequest('http://localhost:3000/api/metrics/web-vitals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => 'success',
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });

    it('should accept all device types', async () => {
      const deviceTypes = ['mobile', 'tablet', 'desktop'];

      for (const deviceType of deviceTypes) {
        const payload = {
          metrics: [
            {
              name: 'LCP',
              value: 2500,
              rating: 'good',
              route: '/test',
              deviceType,
            },
          ],
        };

        const request = new NextRequest('http://localhost:3000/api/metrics/web-vitals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => 'success',
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });

    it('should accept all rating values', async () => {
      const ratings = ['good', 'needs-improvement', 'poor'];

      for (const rating of ratings) {
        const payload = {
          metrics: [
            {
              name: 'LCP',
              value: 2500,
              rating,
              route: '/test',
              deviceType: 'desktop',
            },
          ],
        };

        const request = new NextRequest('http://localhost:3000/api/metrics/web-vitals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => 'success',
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });
  });
});
