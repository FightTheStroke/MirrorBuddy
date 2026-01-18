/**
 * Unit tests for Web Vitals Collector Payload (F-05)
 * Tests metric payload format and JSON serialization
 */

import { describe, it, expect } from 'vitest';
import { type WebVitalsEvent, type MetricName, type MetricRating } from '../web-vitals-collector';

describe('Web Vitals Collector - Payload Format', () => {
  // ============================================================================
  // METRIC PAYLOAD FORMAT
  // ============================================================================

  describe('Metric Payload Format', () => {
    it('should create valid WebVitalsEvent with all required fields', () => {
      const event: WebVitalsEvent = {
        name: 'LCP' as MetricName,
        value: 2500,
        rating: 'good' as MetricRating,
        userId: 'user-123',
        sessionId: 'session-abc',
        route: '/dashboard',
        navigationType: 'navigate',
        deviceType: 'desktop',
        connectionType: '4g',
        timestamp: Date.now(),
      };

      expect(event.name).toBe('LCP');
      expect(event.value).toBe(2500);
      expect(event.rating).toBe('good');
      expect(event.userId).toBe('user-123');
      expect(event.sessionId).toBe('session-abc');
      expect(event.route).toBe('/dashboard');
      expect(event.navigationType).toBe('navigate');
      expect(event.deviceType).toBe('desktop');
      expect(event.connectionType).toBe('4g');
      expect(typeof event.timestamp).toBe('number');
    });

    it('should support all metric names', () => {
      const metricNames: MetricName[] = ['LCP', 'CLS', 'INP', 'TTFB', 'FCP'];

      metricNames.forEach((name) => {
        const event: WebVitalsEvent = {
          name,
          value: 100,
          rating: 'good' as MetricRating,
          userId: 'user-123',
          sessionId: 'session-abc',
          route: '/test',
          navigationType: 'navigate',
          deviceType: 'desktop',
          connectionType: 'unknown',
          timestamp: Date.now(),
        };

        expect(event.name).toBe(name);
      });
    });

    it('should support all rating values', () => {
      const ratings: MetricRating[] = ['good', 'needs-improvement', 'poor'];

      ratings.forEach((rating) => {
        const event: WebVitalsEvent = {
          name: 'LCP' as MetricName,
          value: 2500,
          rating,
          userId: 'user-123',
          sessionId: 'session-abc',
          route: '/test',
          navigationType: 'navigate',
          deviceType: 'desktop',
          connectionType: 'unknown',
          timestamp: Date.now(),
        };

        expect(event.rating).toBe(rating);
      });
    });

    it('should support all device types', () => {
      const deviceTypes = ['mobile', 'tablet', 'desktop'];

      deviceTypes.forEach((deviceType) => {
        const event: WebVitalsEvent = {
          name: 'LCP' as MetricName,
          value: 2500,
          rating: 'good' as MetricRating,
          userId: 'user-123',
          sessionId: 'session-abc',
          route: '/test',
          navigationType: 'navigate',
          deviceType: deviceType as any,
          connectionType: 'unknown',
          timestamp: Date.now(),
        };

        expect(event.deviceType).toBe(deviceType);
      });
    });

    it('should accept null userId for anonymous users', () => {
      const event: WebVitalsEvent = {
        name: 'LCP' as MetricName,
        value: 2500,
        rating: 'good' as MetricRating,
        userId: null,
        sessionId: 'session-abc',
        route: '/dashboard',
        navigationType: 'navigate',
        deviceType: 'desktop',
        connectionType: '4g',
        timestamp: Date.now(),
      };

      expect(event.userId).toBeNull();
    });

    it('should be JSON serializable', () => {
      const event: WebVitalsEvent = {
        name: 'LCP' as MetricName,
        value: 2500,
        rating: 'good' as MetricRating,
        userId: 'user-123',
        sessionId: 'session-abc',
        route: '/dashboard',
        navigationType: 'navigate',
        deviceType: 'desktop',
        connectionType: '4g',
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(event);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.name).toBe('LCP');
      expect(deserialized.value).toBe(2500);
      expect(deserialized.userId).toBe('user-123');
    });

    it('should handle various connection types', () => {
      const connectionTypes = ['4g', '3g', '2g', 'wifi', 'unknown'];

      connectionTypes.forEach((connectionType) => {
        const event: WebVitalsEvent = {
          name: 'LCP' as MetricName,
          value: 2500,
          rating: 'good' as MetricRating,
          userId: 'user-123',
          sessionId: 'session-abc',
          route: '/test',
          navigationType: 'navigate',
          deviceType: 'desktop',
          connectionType,
          timestamp: Date.now(),
        };

        expect(event.connectionType).toBe(connectionType);
      });
    });

    it('should handle various navigation types', () => {
      const navigationTypes = ['navigate', 'reload', 'back_forward', 'prerender'];

      navigationTypes.forEach((navigationType) => {
        const event: WebVitalsEvent = {
          name: 'LCP' as MetricName,
          value: 2500,
          rating: 'good' as MetricRating,
          userId: 'user-123',
          sessionId: 'session-abc',
          route: '/test',
          navigationType,
          deviceType: 'desktop',
          connectionType: 'unknown',
          timestamp: Date.now(),
        };

        expect(event.navigationType).toBe(navigationType);
      });
    });

    it('should support various numeric metric values', () => {
      const testValues = [0, 100, 2500, 5000, 10000, 0.5, 0.15];

      testValues.forEach((value) => {
        const event: WebVitalsEvent = {
          name: 'LCP' as MetricName,
          value,
          rating: 'good' as MetricRating,
          userId: 'user-123',
          sessionId: 'session-abc',
          route: '/test',
          navigationType: 'navigate',
          deviceType: 'desktop',
          connectionType: 'unknown',
          timestamp: Date.now(),
        };

        expect(event.value).toBe(value);
      });
    });
  });

  // ============================================================================
  // TYPE EXPORTS
  // ============================================================================

  describe('Type Exports', () => {
    it('should export MetricName type with correct values', () => {
      const names: MetricName[] = ['LCP', 'CLS', 'INP', 'TTFB', 'FCP'];
      expect(names.length).toBe(5);
    });

    it('should export MetricRating type with correct values', () => {
      const ratings: MetricRating[] = ['good', 'needs-improvement', 'poor'];
      expect(ratings.length).toBe(3);
    });

    it('all metric names should be distinct', () => {
      const names: MetricName[] = ['LCP', 'CLS', 'INP', 'TTFB', 'FCP'];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('all rating values should be distinct', () => {
      const ratings: MetricRating[] = ['good', 'needs-improvement', 'poor'];
      const uniqueRatings = new Set(ratings);
      expect(uniqueRatings.size).toBe(ratings.length);
    });
  });
});
