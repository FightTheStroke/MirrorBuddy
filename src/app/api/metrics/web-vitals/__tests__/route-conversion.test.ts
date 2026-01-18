/**
 * Unit tests for Web Vitals API Endpoint - Conversion and Grafana (F-05)
 * Tests metric unit conversion and Grafana integration
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

describe('POST /api/metrics/web-vitals - Conversion and Grafana', () => {
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
  // METRIC CONVERSION
  // ============================================================================

  describe('Metric Conversion to Seconds', () => {
    it('should convert time-based metrics to seconds', async () => {
      const tests = [
        { name: 'LCP', value: 2500, expected: '2.5' },
        { name: 'FCP', value: 1800, expected: '1.8' },
        { name: 'TTFB', value: 800, expected: '0.8' },
      ];

      for (const test of tests) {
        const payload = {
          metrics: [
            {
              name: test.name,
              value: test.value,
              rating: 'good',
              route: '/dashboard',
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

        await POST(request);

        const callArgs = (global.fetch as any).mock.calls[(global.fetch as any).mock.calls.length - 1];
        const body = callArgs[1].body;
        expect(body).toContain(test.expected);
      }
    });

    it('should NOT convert CLS score (unitless)', async () => {
      const payload = {
        metrics: [
          {
            name: 'CLS',
            value: 0.15,
            rating: 'needs-improvement',
            route: '/dashboard',
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

      await POST(request);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = callArgs[1].body;

      expect(body).toContain('0.15');
    });
  });

  // ============================================================================
  // GRAFANA INTEGRATION
  // ============================================================================

  describe('Grafana Integration', () => {
    it('should call Grafana Cloud with correct headers', async () => {
      const payload = {
        metrics: [
          {
            name: 'LCP',
            value: 2500,
            rating: 'good',
            route: '/dashboard',
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

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://prometheus.grafana.com/api/v1/write',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
            Authorization: expect.stringContaining('Basic '),
          }),
        })
      );
    });

    it('should use Influx Line Protocol format', async () => {
      const payload = {
        metrics: [
          {
            name: 'LCP',
            value: 2500,
            rating: 'good',
            route: '/dashboard',
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

      await POST(request);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = callArgs[1].body;

      expect(body).toContain('web_vitals_lcp_seconds');
      expect(body).toContain('route=/dashboard');
      expect(body).toContain('device_type=desktop');
      expect(body).toContain('value=');
    });

    it('should include userId in labels when provided', async () => {
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

      await POST(request);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = callArgs[1].body;

      expect(body).toContain('user_id=user-123');
    });

  });
});
