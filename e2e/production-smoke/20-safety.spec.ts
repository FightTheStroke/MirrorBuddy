/**
 * Production Smoke Tests — Safety & AI Transparency
 *
 * Verifies public safety signals, compliance pages, and read-only safety APIs.
 */

import { test, expect, PROD_URL } from './fixtures';
import { request as pwRequest } from '@playwright/test';

interface MaestroSafetyPayload {
  id: string;
  name?: string | null;
  subject?: string | null;
  type?: string | null;
  greeting?: string | null;
  quote?: string | null;
}

const AI_DISCLAIMER_PATTERN =
  /creat[oa]\s+con\s+ia|generat[oa]\s+con\s+ia|intelligenza artificiale|risposte.*ia|contenut[oi].*ia/i;
const HUMAN_OVERSIGHT_PATTERN =
  /supervisione umana|revisione umana|controllo umano|human oversight|escalation|supporto umano/i;
const TERMS_LIMITATION_PATTERN =
  /non sostituisce|limitat|pu[oò]\s+sbagliare|potrebbe essere errat|verifica sempre|non costituisce/i;
const BIAS_PATTERN = /bias|pregiudizi|discriminaz|equit|fairness/i;
const CRISIS_PATTERN = /crisi|emergenz|112|supporto immediat|aiuto urgente|escalation/i;
const INAPPROPRIATE_PATTERN =
  /\b(porno|pornografia|sesso esplicito|violenza grafica|droghe pesanti|suicidio|autolesionismo)\b/i;

async function getApiStatus(path: string): Promise<number> {
  const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
  try {
    const res = await ctx.get(path);
    return res.status();
  } finally {
    await ctx.dispose();
  }
}

async function getMaestri(): Promise<MaestroSafetyPayload[]> {
  const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
  try {
    const res = await ctx.get('/api/maestri');
    expect(res.status()).toBe(200);
    return (await res.json()) as MaestroSafetyPayload[];
  } finally {
    await ctx.dispose();
  }
}

test.describe('PROD-SMOKE: Safety & Transparency', () => {
  test('Chat UI shows AI disclaimer footer', async ({ page }) => {
    await page.goto('/it');
    await page
      .getByRole('button', { name: /Studia con /i })
      .first()
      .click();
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10000 });
    const content = (await page.textContent('body')) ?? '';
    expect(content).toMatch(AI_DISCLAIMER_PATTERN);
  });

  test('/it/ai-transparency page is accessible with content', async ({ page }) => {
    await page.goto('/it/ai-transparency');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const content = (await page.textContent('body')) ?? '';
    expect(content.length).toBeGreaterThan(500);
  });

  test('Professor cards area shows AI-generated disclaimer text', async ({ page }) => {
    await page.goto('/it');
    const content = (await page.textContent('body')) ?? '';
    expect(content).toMatch(AI_DISCLAIMER_PATTERN);
  });

  test('/api/safety/check rejects requests without auth', async () => {
    const status = await getApiStatus('/api/safety/check');
    expect(status).toBeGreaterThanOrEqual(400);
  });

  test('/api/safety/report rejects requests without auth', async () => {
    const status = await getApiStatus('/api/safety/report');
    expect(status).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/maestri returns valid character records', async () => {
    const maestri = await getMaestri();
    expect(maestri.length).toBeGreaterThan(0);
    for (const maestro of maestri) {
      expect(maestro).toHaveProperty('id');
      expect(maestro).toHaveProperty('name');
      expect(maestro).toHaveProperty('subject');
    }
  });

  test('All professors from /api/maestri have subject field', async () => {
    const maestri = await getMaestri();
    for (const maestro of maestri) {
      expect(maestro.subject).toBeTruthy();
    }
  });

  test('No professor has empty or null name', async () => {
    const maestri = await getMaestri();
    for (const maestro of maestri) {
      expect(typeof maestro.name).toBe('string');
      expect((maestro.name ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  test('Bias detection endpoint exists or transparency page mentions bias controls', async ({
    page,
  }) => {
    const status = await getApiStatus('/api/safety/bias');
    if (status === 404) {
      await page.goto('/it/ai-transparency');
      const content = (await page.textContent('body')) ?? '';
      expect(content).toMatch(BIAS_PATTERN);
      return;
    }
    expect(status).toBeGreaterThanOrEqual(400);
  });

  test('AI transparency page mentions human oversight or escalation', async ({ page }) => {
    await page.goto('/it/ai-transparency');
    const content = (await page.textContent('body')) ?? '';
    expect(content).toMatch(HUMAN_OVERSIGHT_PATTERN);
  });

  test('Terms page mentions limitations of AI responses', async ({ page }) => {
    await page.goto('/it/terms');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const content = (await page.textContent('body')) ?? '';
    expect(content).toMatch(TERMS_LIMITATION_PATTERN);
  });

  test('Welcome page does not contain inappropriate content', async ({ page }) => {
    await page.goto('/it/welcome');
    const content = (await page.textContent('body')) ?? '';
    expect(content).not.toMatch(INAPPROPRIATE_PATTERN);
  });

  test('Sample professor quotes are present and age-appropriate', async () => {
    const maestri = await getMaestri();
    const sample = maestri.slice(0, 4);
    expect(sample).toHaveLength(4);
    for (const maestro of sample) {
      const quote = (maestro.quote ?? maestro.greeting ?? '').trim();
      expect(quote.length).toBeGreaterThan(6);
      expect(quote).not.toMatch(INAPPROPRIATE_PATTERN);
    }
  });

  test('Chat UI has visible close action (Chiudi)', async ({ page }) => {
    await page.goto('/it');
    await page
      .getByRole('button', { name: /Studia con /i })
      .first()
      .click();
    await expect(page.getByRole('button', { name: 'Chiudi', exact: true })).toBeVisible({
      timeout: 10000,
    });
  });

  test('Crisis endpoint exists or transparency page mentions crisis handling', async ({ page }) => {
    const status = await getApiStatus('/api/safety/crisis');
    if (status === 404) {
      await page.goto('/it/ai-transparency');
      const content = (await page.textContent('body')) ?? '';
      expect(content).toMatch(CRISIS_PATTERN);
      return;
    }
    expect(status).toBeGreaterThanOrEqual(400);
  });
});
