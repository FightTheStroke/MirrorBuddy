// ============================================================================
// E2E TESTS: Autonomy API
// Tests for /api/progress/autonomy endpoint which calculates student autonomy metrics
// STATUS: SKIPPED - Endpoint not yet implemented (tracked in backlog)
// ============================================================================

import { test, expect } from '@playwright/test';

// Skip entire suite - endpoint not implemented
test.describe.skip('Autonomy API: Mind Maps Tracking', () => {
  test.beforeEach(async ({ request }) => {
    // Ensure user exists
    await request.get('/api/user');
  });

  test('GET /api/progress/autonomy - returns autonomy metrics', async ({ request }) => {
    const response = await request.get('/api/progress/autonomy');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.overall).toBeDefined();
    expect(data.metrics).toBeDefined();
    expect(data.skills).toBeDefined();
    expect(data.readinessLevel).toBeDefined();
  });

  test('GET /api/progress/autonomy - includes mindMapsCreated in metrics', async ({ request }) => {
    const response = await request.get('/api/progress/autonomy');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.metrics.mindMapsCreated).toBeDefined();
    expect(typeof data.metrics.mindMapsCreated).toBe('number');
    expect(data.metrics.mindMapsCreated).toBeGreaterThanOrEqual(0);
  });

  test('GET /api/progress/autonomy - overall score is between 0 and 100', async ({ request }) => {
    const response = await request.get('/api/progress/autonomy');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.overall).toBeGreaterThanOrEqual(0);
    expect(data.overall).toBeLessThanOrEqual(100);
  });

  test('GET /api/progress/autonomy - skills array contains expected categories', async ({
    request,
  }) => {
    const response = await request.get('/api/progress/autonomy');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.skills)).toBeTruthy();

    // Check that each skill has required properties
    for (const skill of data.skills) {
      expect(skill.name).toBeDefined();
      expect(skill.score).toBeDefined();
      expect(typeof skill.score).toBe('number');
      expect(skill.score).toBeGreaterThanOrEqual(0);
      expect(skill.score).toBeLessThanOrEqual(100);
    }
  });

  test('GET /api/progress/autonomy - readinessLevel is valid', async ({ request }) => {
    const response = await request.get('/api/progress/autonomy');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const validLevels = ['beginner', 'developing', 'intermediate', 'advanced', 'expert'];
    expect(validLevels).toContain(data.readinessLevel);
  });

  test('Autonomy metrics update after methodProgress changes', async ({ request }) => {
    // Get initial autonomy metrics
    const initialResponse = await request.get('/api/progress/autonomy');
    expect(initialResponse.ok()).toBeTruthy();
    const _initialData = await initialResponse.json();

    // Update method progress with mind maps
    const methodProgressResponse = await request.put('/api/progress/method', {
      data: {
        mindMaps: JSON.stringify({
          createdAlone: 3,
          createdWithHints: 2,
          createdWithFullHelp: 1,
        }),
      },
    });

    // Only check if method progress endpoint exists
    if (methodProgressResponse.ok()) {
      // Get updated autonomy metrics
      const updatedResponse = await request.get('/api/progress/autonomy');
      expect(updatedResponse.ok()).toBeTruthy();
      const updatedData = await updatedResponse.json();

      // Should reflect the updated mind maps count (3 + 2 + 1 = 6)
      expect(updatedData.metrics.mindMapsCreated).toBe(6);
    }
  });
});
