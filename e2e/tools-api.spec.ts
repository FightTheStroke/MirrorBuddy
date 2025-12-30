// ============================================================================
// E2E TESTS: Tools API Integration
// Full flow test for tool creation, persistence, and retrieval
// T-22: Integration test - full tool flow
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Tools API: Materials Persistence', () => {
  let testUserId: string;

  test.beforeEach(async ({ request }) => {
    // Ensure user exists
    const userResponse = await request.get('/api/user');
    const userData = await userResponse.json();
    testUserId = userData.id;
  });

  test('POST /api/materials - creates a new mindmap material', async ({ request }) => {
    const material = {
      userId: testUserId,
      toolId: `mindmap-${Date.now()}`,
      toolType: 'mindmap',
      title: 'Teorema di Pitagora',
      content: {
        centralTopic: 'Teorema di Pitagora',
        nodes: [
          { id: 'n1', label: 'a² + b² = c²', parentId: null },
          { id: 'n2', label: 'Cateti', parentId: 'n1' },
          { id: 'n3', label: 'Ipotenusa', parentId: 'n1' },
        ],
      },
      maestroId: 'archimede',
      subject: 'mathematics',
    };

    const response = await request.post('/api/materials', {
      data: material,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.created).toBe(true);
    expect(data.material.toolId).toBe(material.toolId);
    expect(data.material.toolType).toBe('mindmap');
  });

  test('POST /api/materials - creates a quiz material', async ({ request }) => {
    const material = {
      userId: testUserId,
      toolId: `quiz-${Date.now()}`,
      toolType: 'quiz',
      title: 'Quiz sulla Rivoluzione Francese',
      content: {
        questions: [
          {
            id: 'q1',
            question: 'In che anno iniziò la Rivoluzione Francese?',
            options: ['1789', '1776', '1804', '1815'],
            correctIndex: 0,
            explanation: 'La Rivoluzione Francese iniziò nel 1789 con la presa della Bastiglia.',
          },
          {
            id: 'q2',
            question: 'Chi era il re di Francia durante la Rivoluzione?',
            options: ['Luigi XIV', 'Luigi XV', 'Luigi XVI', 'Napoleone'],
            correctIndex: 2,
          },
        ],
      },
      maestroId: 'cesare',
      subject: 'history',
    };

    const response = await request.post('/api/materials', {
      data: material,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.material.toolType).toBe('quiz');
    expect(data.material.content.questions).toHaveLength(2);
  });

  test('POST /api/materials - creates flashcard material', async ({ request }) => {
    const material = {
      userId: testUserId,
      toolId: `flashcard-${Date.now()}`,
      toolType: 'flashcard',
      title: 'Vocabolario Inglese',
      content: {
        cards: [
          { id: 'c1', front: 'Hello', back: 'Ciao', hint: 'Saluto comune' },
          { id: 'c2', front: 'Goodbye', back: 'Arrivederci' },
          { id: 'c3', front: 'Thank you', back: 'Grazie' },
        ],
      },
      maestroId: 'shakespeare',
      subject: 'english',
    };

    const response = await request.post('/api/materials', {
      data: material,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.material.toolType).toBe('flashcard');
    expect(data.material.content.cards).toHaveLength(3);
  });

  test('GET /api/materials - retrieves materials for user', async ({ request }) => {
    // First create some materials
    const toolId = `get-test-${Date.now()}`;
    await request.post('/api/materials', {
      data: {
        userId: testUserId,
        toolId,
        toolType: 'mindmap',
        title: 'Test Material',
        content: { centralTopic: 'Test' },
      },
    });

    const response = await request.get(`/api/materials?userId=${testUserId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.materials).toBeDefined();
    expect(Array.isArray(data.materials)).toBeTruthy();
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/materials - filters by toolType', async ({ request }) => {
    // Create quiz
    await request.post('/api/materials', {
      data: {
        userId: testUserId,
        toolId: `filter-quiz-${Date.now()}`,
        toolType: 'quiz',
        title: 'Filter Test Quiz',
        content: { questions: [] },
      },
    });

    const response = await request.get(`/api/materials?userId=${testUserId}&toolType=quiz`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.materials.every((m: { toolType: string }) => m.toolType === 'quiz')).toBeTruthy();
  });

  test('POST /api/materials - upserts on duplicate toolId', async ({ request }) => {
    const toolId = `upsert-test-${Date.now()}`;

    // Create initial
    await request.post('/api/materials', {
      data: {
        userId: testUserId,
        toolId,
        toolType: 'mindmap',
        title: 'Original Title',
        content: { centralTopic: 'Original' },
      },
    });

    // Update with same toolId
    const response = await request.post('/api/materials', {
      data: {
        userId: testUserId,
        toolId,
        toolType: 'mindmap',
        title: 'Updated Title',
        content: { centralTopic: 'Updated' },
      },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.updated).toBe(true);
    expect(data.material.title).toBe('Updated Title');
  });

  test('PATCH /api/materials - updates material status', async ({ request }) => {
    const toolId = `patch-test-${Date.now()}`;

    // Create
    await request.post('/api/materials', {
      data: {
        userId: testUserId,
        toolId,
        toolType: 'flashcard',
        title: 'Patch Test',
        content: { cards: [] },
      },
    });

    // Archive
    const response = await request.patch('/api/materials', {
      data: {
        toolId,
        status: 'archived',
      },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('DELETE /api/materials - soft deletes material', async ({ request }) => {
    const toolId = `delete-test-${Date.now()}`;

    // Create
    await request.post('/api/materials', {
      data: {
        userId: testUserId,
        toolId,
        toolType: 'quiz',
        title: 'Delete Test',
        content: { questions: [] },
      },
    });

    // Delete
    const response = await request.delete(`/api/materials?toolId=${toolId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.toolId).toBe(toolId);

    // Verify not in active list
    const getResponse = await request.get(`/api/materials?userId=${testUserId}&status=active`);
    const materials = await getResponse.json();
    const found = materials.materials.find((m: { toolId: string }) => m.toolId === toolId);
    expect(found).toBeUndefined();
  });
});

test.describe('Tools API: Tool Events', () => {
  test('POST /api/tools/events - publishes tool:created event', async ({ request }) => {
    const event = {
      sessionId: `test-session-${Date.now()}`,
      maestroId: 'archimede',
      type: 'tool:created',
      toolType: 'mindmap',
      data: {
        title: 'Test Mindmap',
        subject: 'mathematics',
      },
    };

    const response = await request.post('/api/tools/events', {
      data: event,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.eventId).toBeDefined();
  });

  test('POST /api/tools/events - publishes tool:update event', async ({ request }) => {
    const event = {
      sessionId: `test-session-${Date.now()}`,
      maestroId: 'da-vinci',
      type: 'tool:update',
      toolType: 'diagram',
      toolId: `tool-${Date.now()}`,
      data: {
        progress: 50,
        chunk: 'graph LR; A-->B;',
      },
    };

    const response = await request.post('/api/tools/events', {
      data: event,
    });
    expect(response.ok()).toBeTruthy();
  });

  test('POST /api/tools/events - publishes tool:complete event', async ({ request }) => {
    const event = {
      sessionId: `test-session-${Date.now()}`,
      maestroId: 'dante',
      type: 'tool:complete',
      toolType: 'summary',
      toolId: `tool-${Date.now()}`,
      data: {
        content: {
          sections: [
            { id: 's1', heading: 'Introduzione', content: 'Testo riassuntivo...' },
          ],
        },
      },
    };

    const response = await request.post('/api/tools/events', {
      data: event,
    });
    expect(response.ok()).toBeTruthy();
  });

  test('POST /api/tools/events - validates tool type', async ({ request }) => {
    const event = {
      sessionId: 'test-session',
      maestroId: 'archimede',
      type: 'tool:created',
      toolType: 'invalid-type',
      data: {},
    };

    const response = await request.post('/api/tools/events', {
      data: event,
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid tool type');
  });

  test('POST /api/tools/events - validates event type', async ({ request }) => {
    const event = {
      sessionId: 'test-session',
      maestroId: 'archimede',
      type: 'invalid:event',
      toolType: 'mindmap',
      data: {},
    };

    const response = await request.post('/api/tools/events', {
      data: event,
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid event type');
  });

  test('GET /api/tools/events - returns endpoint info', async ({ request }) => {
    const response = await request.get('/api/tools/events');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.endpoint).toBe('/api/tools/events');
    expect(data.eventTypes).toBeDefined();
    expect(data.toolTypes).toBeDefined();
  });
});

test.describe('Tools API: Tool Creation', () => {
  test('POST /api/tools/create - creates tool from voice command', async ({ request }) => {
    const toolRequest = {
      sessionId: `voice-session-${Date.now()}`,
      maestroId: 'archimede',
      toolType: 'mindmap',
      title: 'Equazioni di secondo grado',
      subject: 'mathematics',
      content: {
        title: 'Equazioni di secondo grado',
        topic: 'Algebra',
        nodes: [
          { id: '1', label: 'ax² + bx + c = 0', parentId: null },
          { id: '2', label: 'Formula risolutiva', parentId: '1' },
        ],
      },
    };

    const response = await request.post('/api/tools/create', {
      data: toolRequest,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.toolId).toBeDefined();
    expect(data.toolType).toBe('mindmap');
    expect(data.status).toBeDefined();
  });

  test('POST /api/tools/create - validates required fields', async ({ request }) => {
    const response = await request.post('/api/tools/create', {
      data: {
        sessionId: 'test',
        // Missing required fields
      },
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Missing required fields');
  });

  test('GET /api/tools/create - returns endpoint info', async ({ request }) => {
    const response = await request.get('/api/tools/create');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.endpoint).toBe('/api/tools/create');
    expect(data.toolTypes).toBeDefined();
    expect(data.example).toBeDefined();
  });
});

test.describe('Tools Integration: Full Flow', () => {
  test('Complete tool creation flow: event → persist → retrieve', async ({ request }) => {
    const sessionId = `full-flow-${Date.now()}`;
    const toolId = `tool-${sessionId}`;
    const maestroId = 'archimede';

    // Get user
    const userResponse = await request.get('/api/user');
    const { id: userId } = await userResponse.json();

    // Step 1: Broadcast tool:created event
    const createEventResponse = await request.post('/api/tools/events', {
      data: {
        sessionId,
        maestroId,
        type: 'tool:created',
        toolType: 'mindmap',
        toolId,
        data: {
          title: 'Integration Test Mindmap',
          subject: 'mathematics',
        },
      },
    });
    expect(createEventResponse.ok()).toBeTruthy();

    // Step 2: Broadcast tool:update events (simulating streaming)
    for (let progress = 25; progress <= 75; progress += 25) {
      const updateResponse = await request.post('/api/tools/events', {
        data: {
          sessionId,
          maestroId,
          type: 'tool:update',
          toolType: 'mindmap',
          toolId,
          data: { progress },
        },
      });
      expect(updateResponse.ok()).toBeTruthy();
    }

    // Step 3: Broadcast tool:complete
    const completeEventResponse = await request.post('/api/tools/events', {
      data: {
        sessionId,
        maestroId,
        type: 'tool:complete',
        toolType: 'mindmap',
        toolId,
        data: {
          content: {
            centralTopic: 'Teorema di Pitagora',
            nodes: [
              { id: 'n1', label: 'a² + b² = c²', parentId: null },
            ],
          },
        },
      },
    });
    expect(completeEventResponse.ok()).toBeTruthy();

    // Step 4: Persist to database
    const persistResponse = await request.post('/api/materials', {
      data: {
        userId,
        toolId,
        toolType: 'mindmap',
        title: 'Integration Test Mindmap',
        content: {
          centralTopic: 'Teorema di Pitagora',
          nodes: [{ id: 'n1', label: 'a² + b² = c²', parentId: null }],
        },
        maestroId,
        sessionId,
        subject: 'mathematics',
      },
    });
    expect(persistResponse.ok()).toBeTruthy();

    // Step 5: Retrieve and verify
    const retrieveResponse = await request.get(`/api/materials?userId=${userId}&toolType=mindmap`);
    expect(retrieveResponse.ok()).toBeTruthy();

    const { materials } = await retrieveResponse.json();
    const savedMaterial = materials.find((m: { toolId: string }) => m.toolId === toolId);

    expect(savedMaterial).toBeDefined();
    expect(savedMaterial.title).toBe('Integration Test Mindmap');
    expect(savedMaterial.maestroId).toBe(maestroId);
    expect(savedMaterial.content.centralTopic).toBe('Teorema di Pitagora');
  });
});
