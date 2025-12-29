import { test, expect } from '@playwright/test';

/**
 * Tests for maestri data integrity and voice configuration
 * These tests run against the /api/maestri endpoint to verify:
 * - All maestri have required fields
 * - Voice mappings are gender-appropriate
 * - VoiceInstructions are properly configured
 */

// Valid Azure OpenAI voices (gpt-4o-realtime)
const VALID_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];

// Masculine voices (suitable for male maestri)
const MASCULINE_VOICES = ['alloy', 'ash', 'echo', 'sage', 'verse'];

// Feminine voices (suitable for female maestri)
const FEMININE_VOICES = ['shimmer', 'coral', 'ballad'];

// Known male maestri
const MALE_MAESTRI = [
  'euclide', 'feynman', 'darwin', 'galileo', 'shakespeare', 'mozart',
  'socrate', 'erodoto', 'manzoni', 'cicerone', 'humboldt', 'ippocrate',
  'smith', 'chris', 'leonardo'
];

// Known female maestri
const FEMALE_MAESTRI = ['curie', 'lovelace'];

test.describe('Maestri API Data', () => {
  test('API returns all maestri', async ({ request }) => {
    const response = await request.get('/api/maestri');
    expect(response.ok()).toBeTruthy();

    const maestri = await response.json();
    expect(Array.isArray(maestri)).toBeTruthy();
    expect(maestri.length).toBeGreaterThanOrEqual(16); // Currently 16 maestri
  });

  test('each maestro has required fields', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    for (const maestro of maestri) {
      // Required fields per Maestro interface
      expect(maestro.id).toBeTruthy();
      expect(maestro.name).toBeTruthy();
      expect(maestro.subject).toBeTruthy();
      expect(maestro.specialty).toBeTruthy();
      expect(maestro.teachingStyle).toBeTruthy();
      expect(maestro.greeting).toBeTruthy();
      expect(maestro.systemPrompt).toBeTruthy();

      // Voice field must be present and valid
      expect(maestro.voice).toBeTruthy();
      expect(VALID_VOICES).toContain(maestro.voice);
    }
  });

  test('each maestro has voiceInstructions', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    for (const maestro of maestri) {
      // All maestri should have voiceInstructions for Azure Realtime
      expect(maestro.voiceInstructions).toBeTruthy();
      expect(typeof maestro.voiceInstructions).toBe('string');
      expect(maestro.voiceInstructions.length).toBeGreaterThan(50);
    }
  });
});

test.describe('Voice Mapping Validation', () => {
  test('male maestri have masculine voices', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    for (const maestro of maestri) {
      const id = maestro.id.toLowerCase();

      // Check if this is a known male maestro
      if (MALE_MAESTRI.some(male => id.includes(male))) {
        expect(MASCULINE_VOICES).toContain(maestro.voice);
      }
    }
  });

  test('female maestri have feminine voices', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    for (const maestro of maestri) {
      const id = maestro.id.toLowerCase();

      // Check if this is a known female maestro
      if (FEMALE_MAESTRI.some(female => id.includes(female))) {
        expect(FEMININE_VOICES).toContain(maestro.voice);
      }
    }
  });

  test('Mozart has sage voice (not shimmer)', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const mozart = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('mozart'));
    expect(mozart).toBeTruthy();
    expect(mozart.voice).toBe('sage');
  });

  test('Erodoto has echo voice (not ballad)', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const erodoto = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('erodoto'));
    expect(erodoto).toBeTruthy();
    expect(erodoto.voice).toBe('echo');
  });

  test('Cicerone has echo voice (not ballad)', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const cicerone = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('cicerone'));
    expect(cicerone).toBeTruthy();
    expect(cicerone.voice).toBe('echo');
  });

  test('Manzoni has sage voice (not coral)', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const manzoni = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('manzoni'));
    expect(manzoni).toBeTruthy();
    expect(manzoni.voice).toBe('sage');
  });

  test('Leonardo has alloy voice (not coral)', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const leonardo = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('leonardo'));
    expect(leonardo).toBeTruthy();
    expect(leonardo.voice).toBe('alloy');
  });

  test('Ippocrate has sage voice (not coral)', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const ippocrate = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('ippocrate'));
    expect(ippocrate).toBeTruthy();
    expect(ippocrate.voice).toBe('sage');
  });
});

test.describe('Enhanced Voice Personalities', () => {
  test('Cicerone has rhetorical voiceInstructions', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const cicerone = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('cicerone'));
    expect(cicerone).toBeTruthy();
    expect(cicerone.voiceInstructions).toBeTruthy();

    // Check for rhetorical elements
    const instructions = cicerone.voiceInstructions.toLowerCase();
    expect(instructions).toContain('rhetorical');
    expect(instructions).toContain('orator');
  });

  test('Erodoto has storytelling voiceInstructions', async ({ request }) => {
    const response = await request.get('/api/maestri');
    const maestri = await response.json();

    const erodoto = maestri.find((m: { id: string }) => m.id.toLowerCase().includes('erodoto'));
    expect(erodoto).toBeTruthy();
    expect(erodoto.voiceInstructions).toBeTruthy();

    // Check for storytelling elements
    const instructions = erodoto.voiceInstructions.toLowerCase();
    expect(instructions).toContain('stories');
    expect(instructions).toContain('history');
  });
});

test.describe('Maestri UI Display', () => {
  test('all maestri are displayed on home page', async ({ page }) => {
    await page.goto('/');

    // Wait for maestri to load
    await page.waitForTimeout(1000);

    // Check for key maestri
    const expectedMaestri = [
      'Euclide',
      'Feynman',
      'Curie',
      'Darwin',
      'Erodoto',
      'Cicerone',
      'Mozart',
      'Leonardo',
    ];

    for (const name of expectedMaestri) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('maestri cards show subject badges', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Each maestro should have a subject
    const subjects = ['Matematica', 'Fisica', 'Storia', 'Arte', 'Musica'];
    let foundSubjects = 0;

    for (const subject of subjects) {
      if (await page.locator(`text=${subject}`).first().isVisible().catch(() => false)) {
        foundSubjects++;
      }
    }

    expect(foundSubjects).toBeGreaterThanOrEqual(3);
  });
});
