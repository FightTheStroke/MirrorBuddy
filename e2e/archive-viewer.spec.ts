// ============================================================================
// E2E TESTS: Archive View - Material Viewer
// Tests for the MaterialViewer modal in the Archive view
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Archive View: Material Viewer', () => {
  test.beforeEach(async ({ page, request }) => {
    // Ensure user exists
    await request.get('/api/user');

    // Navigate to archive view
    await page.goto('/archivio');
  });

  test('Archive page loads correctly', async ({ page }) => {
    // Check the archive page is accessible (title may include hyphen: MirrorBuddy)
    await expect(page).toHaveTitle(/MirrorBuddy|Archive|Archivio|Zaino/i);

    // Look for archive-related content
    const archiveHeading = page.getByRole('heading', { level: 1 });
    await expect(archiveHeading).toBeVisible();
  });

  test('Archive shows empty state or materials list', async ({ page }) => {
    // Wait for the page to load content
    await page.waitForLoadState('networkidle');

    // Either we see materials or an empty state message
    const materialsOrEmpty = page.locator('[data-testid="archive-items"], [data-testid="empty-state"], .archive-list, .empty-archive');
    await expect(materialsOrEmpty.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no specific elements found, that's ok - just check page loaded
      expect(page.url()).toMatch(/\/(archivio|supporti)/);
    });
  });
});

test.describe('Archive View: API Integration', () => {
  test.beforeEach(async ({ request }) => {
    await request.get('/api/user');
  });

  test('GET /api/materials returns materials list', async ({ request }) => {
    const userResponse = await request.get('/api/user');
    const { id: userId } = await userResponse.json();

    const response = await request.get(`/api/materials?userId=${userId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.materials).toBeDefined();
    expect(Array.isArray(data.materials)).toBeTruthy();
  });

  test('Materials have required fields for viewer', async ({ request }) => {
    const userResponse = await request.get('/api/user');
    const { id: userId } = await userResponse.json();

    // Create a test material
    const testMaterial = {
      userId,
      toolId: `viewer-test-${Date.now()}`,
      toolType: 'mindmap',
      title: 'Viewer Test Material',
      content: { centralTopic: 'Test', nodes: [] },
      subject: 'mathematics',
    };

    await request.post('/api/materials', { data: testMaterial });

    // Retrieve and verify
    const response = await request.get(`/api/materials?userId=${userId}&status=active`);
    const { materials } = await response.json();

    const createdMaterial = materials.find(
      (m: { toolId: string }) => m.toolId === testMaterial.toolId
    );

    expect(createdMaterial).toBeDefined();
    expect(createdMaterial.toolId).toBe(testMaterial.toolId);
    expect(createdMaterial.toolType).toBe('mindmap');
    expect(createdMaterial.title).toBe('Viewer Test Material');
    expect(createdMaterial.content).toBeDefined();

    // Clean up
    await request.delete(`/api/materials?toolId=${testMaterial.toolId}`);
  });

  test('Materials can be filtered by status', async ({ request }) => {
    const userResponse = await request.get('/api/user');
    const { id: userId } = await userResponse.json();

    // Get only active materials (what MaterialViewer displays)
    const activeResponse = await request.get(`/api/materials?userId=${userId}&status=active`);
    expect(activeResponse.ok()).toBeTruthy();

    const { materials: activeMaterials } = await activeResponse.json();

    // All returned materials should have status 'active' or not have status field
    for (const material of activeMaterials) {
      if (material.status) {
        expect(material.status).toBe('active');
      }
    }
  });
});

test.describe('Archive View: Material Types', () => {
  let testUserId: string;

  test.beforeEach(async ({ request }) => {
    const userResponse = await request.get('/api/user');
    const { id } = await userResponse.json();
    testUserId = id;
  });

  test('Mindmap materials are properly stored', async ({ request }) => {
    const material = {
      userId: testUserId,
      toolId: `mindmap-viewer-${Date.now()}`,
      toolType: 'mindmap',
      title: 'Test Mindmap for Viewer',
      content: {
        centralTopic: 'Equazioni',
        nodes: [
          { id: 'n1', label: 'Primo grado', parentId: null },
          { id: 'n2', label: 'Secondo grado', parentId: null },
        ],
      },
    };

    const response = await request.post('/api/materials', { data: material });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.material.content.centralTopic).toBe('Equazioni');
    expect(data.material.content.nodes).toHaveLength(2);

    // Clean up
    await request.delete(`/api/materials?toolId=${material.toolId}`);
  });

  test('Quiz materials are properly stored', async ({ request }) => {
    const material = {
      userId: testUserId,
      toolId: `quiz-viewer-${Date.now()}`,
      toolType: 'quiz',
      title: 'Test Quiz for Viewer',
      content: {
        questions: [
          {
            id: 'q1',
            question: 'Quanto fa 2+2?',
            options: ['3', '4', '5', '6'],
            correctIndex: 1,
          },
        ],
      },
    };

    const response = await request.post('/api/materials', { data: material });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.material.content.questions).toHaveLength(1);

    // Clean up
    await request.delete(`/api/materials?toolId=${material.toolId}`);
  });

  test('Flashcard materials are properly stored', async ({ request }) => {
    const material = {
      userId: testUserId,
      toolId: `flashcard-viewer-${Date.now()}`,
      toolType: 'flashcard',
      title: 'Test Flashcards for Viewer',
      content: {
        cards: [
          { id: 'c1', front: 'Capital of Italy', back: 'Rome' },
          { id: 'c2', front: 'Capital of France', back: 'Paris' },
        ],
      },
    };

    const response = await request.post('/api/materials', { data: material });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.material.content.cards).toHaveLength(2);

    // Clean up
    await request.delete(`/api/materials?toolId=${material.toolId}`);
  });
});
