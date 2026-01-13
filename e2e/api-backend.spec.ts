// ============================================================================
// E2E TESTS: Backend API Routes
// Tests for persistent data storage and retrieval
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Backend API: User & Settings', () => {
  test('GET /api/user - creates user with cookie', async ({ request }) => {
    const response = await request.get('/api/user');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();
  });

  test('GET /api/user/settings - returns settings', async ({ request }) => {
    // First ensure user exists
    await request.get('/api/user');

    const response = await request.get('/api/user/settings');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // Should return object (empty or with defaults)
    expect(typeof data).toBe('object');
  });

  test('PUT /api/user/settings - updates settings', async ({ request }) => {
    // First ensure user exists
    await request.get('/api/user');

    const settings = {
      theme: 'dark',
      language: 'en',
      accentColor: 'purple',
    };

    const response = await request.put('/api/user/settings', {
      data: settings,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.theme).toBe('dark');
    expect(data.language).toBe('en');
    expect(data.accentColor).toBe('purple');

    // Verify persistence
    const getResponse = await request.get('/api/user/settings');
    const savedData = await getResponse.json();
    expect(savedData.theme).toBe('dark');
  });

  test('GET /api/user/profile - returns profile', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/user/profile');
    expect(response.ok()).toBeTruthy();
  });

  test('PUT /api/user/profile - updates profile', async ({ request }) => {
    await request.get('/api/user');

    const profile = {
      name: 'Test Student',
      age: 15,
      schoolLevel: 'superiore',
      learningGoals: ['Matematica', 'Fisica'],
    };

    const response = await request.put('/api/user/profile', {
      data: profile,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.name).toBe('Test Student');
    expect(data.age).toBe(15);
  });
});

test.describe('Backend API: Progress & Gamification', () => {
  test('GET /api/progress - returns progress', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/progress');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.xp).toBeDefined();
    expect(data.level).toBeDefined();
  });

  test('PUT /api/progress - updates progress', async ({ request }) => {
    await request.get('/api/user');

    const progress = {
      xp: 500,
      level: 3,
      streak: { current: 5, longest: 10 },
      totalStudyMinutes: 120,
      questionsAsked: 25,
    };

    const response = await request.put('/api/progress', {
      data: progress,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.xp).toBe(500);
    expect(data.level).toBe(3);
  });

  test('POST /api/progress/sessions - creates study session', async ({ request }) => {
    await request.get('/api/user');

    const session = {
      maestroId: 'prof-matematica',
      subject: 'Matematica',
      xpEarned: 50,
      questionsAsked: 5,
    };

    const response = await request.post('/api/progress/sessions', {
      data: session,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.maestroId).toBe('prof-matematica');
  });

  test('GET /api/progress/sessions - retrieves sessions', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/progress/sessions?limit=10');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });
});

test.describe('Backend API: Conversations', () => {
  // _conversationId would be used for subsequent tests when implementing full conversation flow
  let _conversationId: string;

  test('POST /api/conversations - creates conversation', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.post('/api/conversations', {
      data: {
        maestroId: 'prof-italiano',
        title: 'Test Conversation',
      },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.maestroId).toBe('prof-italiano');
    _conversationId = data.id;
  });

  test('GET /api/conversations - lists conversations', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/conversations?limit=20');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('POST /api/conversations/[id]/messages - adds message', async ({ request }) => {
    await request.get('/api/user');

    // Create conversation first
    const convResponse = await request.post('/api/conversations', {
      data: { maestroId: 'prof-storia' },
    });
    const conv = await convResponse.json();

    const message = {
      role: 'user',
      content: 'Ciao, mi puoi spiegare la Rivoluzione Francese?',
    };

    const response = await request.post(`/api/conversations/${conv.id}/messages`, {
      data: message,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.role).toBe('user');
    expect(data.content).toContain('Rivoluzione Francese');
  });

  test('GET /api/conversations/[id] - retrieves single conversation', async ({ request }) => {
    await request.get('/api/user');

    // Create conversation
    const convResponse = await request.post('/api/conversations', {
      data: { maestroId: 'prof-scienze' },
    });
    const conv = await convResponse.json();

    const response = await request.get(`/api/conversations/${conv.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBe(conv.id);
    expect(data.messages).toBeDefined();
  });

  test('DELETE /api/conversations/[id] - deletes conversation', async ({ request }) => {
    await request.get('/api/user');

    // Create conversation
    const convResponse = await request.post('/api/conversations', {
      data: { maestroId: 'prof-delete-test' },
    });
    const conv = await convResponse.json();

    const response = await request.delete(`/api/conversations/${conv.id}`);
    expect(response.ok()).toBeTruthy();

    // Verify deletion
    const getResponse = await request.get(`/api/conversations/${conv.id}`);
    expect(getResponse.status()).toBe(404);
  });
});

test.describe('Backend API: Learnings', () => {
  test('POST /api/learnings - creates learning', async ({ request }) => {
    await request.get('/api/user');

    const learning = {
      category: 'preference',
      insight: 'Preferisce esempi visivi per la matematica',
      confidence: 0.7,
    };

    const response = await request.post('/api/learnings', {
      data: learning,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.category).toBe('preference');
    expect(data.insight).toContain('esempi visivi');
  });

  test('POST /api/learnings - reinforces similar learning', async ({ request }) => {
    await request.get('/api/user');

    // Create first learning
    const learning1 = {
      category: 'weakness',
      insight: 'Difficoltà con le frazioni',
      confidence: 0.5,
    };
    await request.post('/api/learnings', { data: learning1 });

    // Try to add similar learning
    const learning2 = {
      category: 'weakness',
      insight: 'Difficoltà con le frazioni e i numeri decimali',
      confidence: 0.6,
    };
    const response = await request.post('/api/learnings', { data: learning2 });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // Should be reinforced (confidence increased)
    expect(data.confidence).toBeGreaterThanOrEqual(0.5);
  });

  test('GET /api/learnings - lists learnings', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/learnings');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /api/learnings?category=preference - filters by category', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/learnings?category=preference');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    // All should be preferences if any exist
    data.forEach((l: { category: string }) => {
      expect(l.category).toBe('preference');
    });
  });

  test('DELETE /api/learnings?id=xxx - deletes learning', async ({ request }) => {
    await request.get('/api/user');

    // Create learning
    const createResponse = await request.post('/api/learnings', {
      data: {
        category: 'interest',
        insight: 'Test learning to delete',
        confidence: 0.5,
      },
    });
    const learning = await createResponse.json();

    // Delete
    const response = await request.delete(`/api/learnings?id=${learning.id}`);
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Backend API: Quiz Results', () => {
  test('POST /api/quizzes/results - saves quiz result', async ({ request }) => {
    await request.get('/api/user');

    const result = {
      quizId: 'quiz-math-1',
      subject: 'Matematica',
      score: 8,
      totalQuestions: 10,
      answers: [
        { questionId: 'q1', answer: 'A', correct: true },
        { questionId: 'q2', answer: 'B', correct: true },
      ],
    };

    const response = await request.post('/api/quizzes/results', {
      data: result,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.score).toBe(8);
    expect(data.percentage).toBe(80);
  });

  test('GET /api/quizzes/results - retrieves results', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/quizzes/results?limit=10');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });
});

test.describe('Backend API: Flashcard Progress', () => {
  test('POST /api/flashcards/progress - creates/updates progress', async ({ request }) => {
    await request.get('/api/user');

    const progress = {
      cardId: 'fc-vocab-1',
      deckId: 'deck-english',
      difficulty: 0.3,
      stability: 1.5,
      state: 'learning',
      reps: 2,
    };

    const response = await request.post('/api/flashcards/progress', {
      data: progress,
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.cardId).toBe('fc-vocab-1');
    expect(data.state).toBe('learning');
  });

  test('GET /api/flashcards/progress - retrieves progress', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/flashcards/progress');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });
});

test.describe('Backend API: Data Persistence', () => {
  test('Data persists across requests', async ({ request }) => {
    // Get user
    await request.get('/api/user');

    // Set some data
    await request.put('/api/user/settings', {
      data: { theme: 'light', language: 'it' },
    });
    await request.put('/api/progress', {
      data: { xp: 1000, level: 5 },
    });

    // Verify persistence in new requests
    const settingsRes = await request.get('/api/user/settings');
    const settings = await settingsRes.json();
    expect(settings.theme).toBe('light');

    const progressRes = await request.get('/api/progress');
    const progress = await progressRes.json();
    expect(progress.xp).toBe(1000);
  });
});

test.describe('Backend API: Parent Dashboard Last Viewed (Issue #64)', () => {
  test('GET /api/profile/last-viewed - returns null initially', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.get('/api/profile/last-viewed');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const isNullOrDate = data.lastViewed === null || typeof data.lastViewed === 'string';
    expect(isNullOrDate).toBeTruthy();
  });

  test('POST /api/profile/last-viewed - sets timestamp', async ({ request }) => {
    await request.get('/api/user');

    const timestamp = new Date().toISOString();
    const response = await request.post('/api/profile/last-viewed', {
      data: { timestamp },
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('GET /api/profile/last-viewed - returns saved timestamp', async ({ request }) => {
    await request.get('/api/user');

    // Set timestamp
    const timestamp = new Date().toISOString();
    await request.post('/api/profile/last-viewed', {
      data: { timestamp },
    });

    // Retrieve and verify
    const response = await request.get('/api/profile/last-viewed');
    const data = await response.json();
    expect(data.lastViewed).toBeDefined();
    expect(new Date(data.lastViewed).getTime()).toBeGreaterThan(0);
  });
});
