// ============================================================================
// E2E TESTS: Collaboration API Routes
// Tests for multi-user mindmap collaboration (Phase 8)
// ============================================================================

import { test, expect } from '@playwright/test';

const sampleMindmap = {
  id: 'test-mindmap-1',
  title: 'Test Mindmap',
  root: {
    id: 'root',
    text: 'Central Topic',
    children: [
      { id: 'child-1', text: 'Sub Topic 1', children: [] },
      { id: 'child-2', text: 'Sub Topic 2', children: [] },
    ],
  },
};

const testUser1 = {
  id: 'user-1',
  name: 'Test User 1',
  avatar: null,
  color: '#FF5733',
};

const testUser2 = {
  id: 'user-2',
  name: 'Test User 2',
  avatar: null,
  color: '#33FF57',
};

test.describe('Collaboration API: Room Management', () => {
  test('POST /api/collab/rooms - creates new room', async ({ request }) => {
    const response = await request.post('/api/collab/rooms', {
      data: {
        mindmap: sampleMindmap,
        user: testUser1,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.room.roomId).toBeDefined();
    expect(data.room.mindmapId).toBe(sampleMindmap.root.id); // Uses root.id
    expect(data.room.participantCount).toBe(1);
  });

  test('GET /api/collab/rooms - lists rooms', async ({ request }) => {
    // First create a room
    await request.post('/api/collab/rooms', {
      data: {
        mindmap: sampleMindmap,
        user: testUser1,
      },
    });

    const response = await request.get('/api/collab/rooms');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.rooms).toBeDefined();
    expect(Array.isArray(data.rooms)).toBe(true);
  });

  test('GET /api/collab/rooms/[roomId] - gets room state', async ({ request }) => {
    // Create room
    const createResponse = await request.post('/api/collab/rooms', {
      data: {
        mindmap: sampleMindmap,
        user: testUser1,
      },
    });
    const { room } = await createResponse.json();

    // Get room state
    const response = await request.get(`/api/collab/rooms/${room.roomId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.roomId).toBe(room.roomId);
    expect(data.participants).toHaveLength(1);
    expect(data.mindmap).toBeDefined();
  });

  test('GET /api/collab/rooms/[roomId] - returns 404 for non-existent room', async ({
    request,
  }) => {
    const response = await request.get('/api/collab/rooms/non-existent-room');
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Room not found');
  });
});

test.describe('Collaboration API: Room Actions', () => {
  let roomId: string;

  test.beforeEach(async ({ request }) => {
    // Create a fresh room for each test
    const createResponse = await request.post('/api/collab/rooms', {
      data: {
        mindmap: sampleMindmap,
        user: testUser1,
      },
    });
    const { room } = await createResponse.json();
    roomId = room.roomId;
  });

  test('POST /api/collab/rooms/[roomId] - join room', async ({ request }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}`, {
      data: {
        action: 'join',
        user: testUser2,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify second user joined
    const stateResponse = await request.get(`/api/collab/rooms/${roomId}`);
    const stateData = await stateResponse.json();
    expect(stateData.participants).toHaveLength(2);
  });

  test('POST /api/collab/rooms/[roomId] - leave room', async ({ request }) => {
    // First join with second user
    await request.post(`/api/collab/rooms/${roomId}`, {
      data: {
        action: 'join',
        user: testUser2,
      },
    });

    // Then leave
    const response = await request.post(`/api/collab/rooms/${roomId}`, {
      data: {
        action: 'leave',
        user: { id: testUser2.id },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify user left
    const stateResponse = await request.get(`/api/collab/rooms/${roomId}`);
    const stateData = await stateResponse.json();
    expect(stateData.participants).toHaveLength(1);
  });

  test('POST /api/collab/rooms/[roomId] - add node', async ({ request }) => {
    const newNode = {
      id: 'new-node-1',
      text: 'New Topic',
      children: [],
    };

    const response = await request.post(`/api/collab/rooms/${roomId}`, {
      data: {
        action: 'add_node',
        user: { id: testUser1.id },
        parentId: 'root',
        node: newNode,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/collab/rooms/[roomId] - update node', async ({ request }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}`, {
      data: {
        action: 'update_node',
        user: { id: testUser1.id },
        nodeId: 'child-1',
        changes: { text: 'Updated Topic' },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/collab/rooms/[roomId] - delete node', async ({ request }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}`, {
      data: {
        action: 'delete_node',
        user: { id: testUser1.id },
        nodeId: 'child-2',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/collab/rooms/[roomId] - returns 400 for invalid action', async ({
    request,
  }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}`, {
      data: {
        action: 'invalid_action',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid action');
  });

  test('DELETE /api/collab/rooms/[roomId] - closes room', async ({ request }) => {
    // testUser1 is the host (created the room in beforeEach)
    const response = await request.delete(`/api/collab/rooms/${roomId}?userId=${testUser1.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);

    // Room should no longer exist
    const stateResponse = await request.get(`/api/collab/rooms/${roomId}`);
    expect(stateResponse.status()).toBe(404);
  });
});

test.describe('Collaboration API: Cursor & Selection Broadcasting', () => {
  let roomId: string;

  test.beforeEach(async ({ request }) => {
    const createResponse = await request.post('/api/collab/rooms', {
      data: {
        mindmap: sampleMindmap,
        user: testUser1,
      },
    });
    const { room } = await createResponse.json();
    roomId = room.roomId;
  });

  test('POST /api/collab/rooms/[roomId]/cursor - broadcasts cursor position', async ({
    request,
  }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}/cursor`, {
      data: {
        userId: testUser1.id,
        cursor: { x: 100, y: 200 },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/collab/rooms/[roomId]/cursor - returns 400 without cursor', async ({
    request,
  }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}/cursor`, {
      data: {
        userId: testUser1.id,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/collab/rooms/[roomId]/select - broadcasts selection', async ({
    request,
  }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}/select`, {
      data: {
        userId: testUser1.id,
        nodeId: 'child-1',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/collab/rooms/[roomId]/select - clears selection with null nodeId', async ({
    request,
  }) => {
    const response = await request.post(`/api/collab/rooms/${roomId}/select`, {
      data: {
        userId: testUser1.id,
        nodeId: null,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

test.describe('Collaboration API: SSE Endpoint', () => {
  test('GET /api/collab/sse - requires roomId and userId', async ({ request }) => {
    const response = await request.get('/api/collab/sse');
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('required');
  });

  test('GET /api/collab/sse - rejects invalid roomId format', async ({ request }) => {
    const response = await request.get('/api/collab/sse?roomId=../../etc/passwd&userId=user-1');
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid');
  });
});
