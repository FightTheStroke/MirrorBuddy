import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/base-fixtures';
import type { AttachmentDocument } from '../src/lib/conversation/attachments/types';
import en from '../messages/en/chat.json';
import it from '../messages/it/chat.json';
import fr from '../messages/fr/chat.json';
import de from '../messages/de/chat.json';
import es from '../messages/es/chat.json';
import { createE2ETestUser } from './helpers/e2e-user-factory';
import { getPrismaClient } from './helpers/prisma-setup';
import { issueTestSession, testSessionCookies } from './helpers/durable-session';
import { trackTestRecord } from './helpers/test-data-registry';
import { cleanupTestData } from './helpers/test-data';
import { twoPagePdf } from './helpers/attachment-pdf';

const translations = { en, it, fr, de, es };

test.describe('Conversation document attachments', () => {
  test('isolates files between two real users and two conversations', async ({
    playwright,
    baseURL,
  }) => {
    const contexts = [];
    try {
      const prisma = getPrismaClient();
      for (let i = 0; i < 2; i++) {
        const { testUserId } = await createE2ETestUser(prisma);
        trackTestRecord('userIds', testUserId);
        const issued = await issueTestSession(prisma, testUserId);
        contexts.push(
          await playwright.request.newContext({
            baseURL,
            storageState: { cookies: testSessionCookies(issued, baseURL), origins: [] },
          }),
        );
      }
      const [owner, other] = contexts;
      const ownerSession = await (await owner.get('/api/session')).json();
      const otherSession = await (await other.get('/api/session')).json();
      const ownerHeaders = { 'x-csrf-token': ownerSession.csrfToken };
      const otherHeaders = { 'x-csrf-token': otherSession.csrfToken };
      const conversations: string[] = [];
      for (let i = 0; i < 2; i++) {
        const response = await owner.post('/api/conversations', {
          headers: ownerHeaders,
          data: { maestroId: 'manzoni' },
        });
        expect(response.status()).toBe(200);
        conversations.push((await response.json()).id);
      }
      const path = `/api/conversations/${conversations[0]}/attachments`;
      const data = {
        name: 'Synthetic.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        pages: [{ pageNumber: 1, text: 'Synthetic private observatory notes.' }],
      };
      const upload = await owner.post(path, { headers: ownerHeaders, data });
      expect(upload.status()).toBe(201);
      const { attachment } = (await upload.json()) as { attachment: AttachmentDocument };
      expect(
        (
          await owner.post(path, {
            headers: ownerHeaders,
            data: { ...data, mimeType: 'image/png' },
          })
        ).status(),
      ).toBe(403);
      expect((await other.get(path)).status()).toBe(404);
      expect((await other.post(path, { headers: otherHeaders, data })).status()).toBe(404);
      expect(
        (await other.delete(`${path}/${attachment.id}`, { headers: otherHeaders })).status(),
      ).toBe(404);
      expect(
        (
          await owner.delete(
            `/api/conversations/${conversations[1]}/attachments/${attachment.id}`,
            { headers: ownerHeaders },
          )
        ).status(),
      ).toBe(404);
      expect((await (await owner.get(path)).json()).attachments).toHaveLength(1);
      const ownerExport = await owner.get('/api/privacy/export-data');
      expect(ownerExport.status()).toBe(200);
      expect((await ownerExport.json()).data.conversationAttachments).toEqual([
        expect.objectContaining({
          id: attachment.id,
          conversationId: conversations[0],
        }),
      ]);
      const otherExport = await other.get('/api/privacy/export-data');
      expect(otherExport.status()).toBe(200);
      expect((await otherExport.json()).data.conversationAttachments).toEqual([]);
      expect(
        (await owner.delete(`${path}/${attachment.id}`, { headers: ownerHeaders })).status(),
      ).toBe(204);
      const cascadeUpload = await owner.post(path, { headers: ownerHeaders, data });
      expect(cascadeUpload.status()).toBe(201);
      const cascadeId = (await cascadeUpload.json()).attachment.id as string;
      expect(
        (
          await owner.delete(`/api/conversations/${conversations[0]}`, {
            headers: ownerHeaders,
          })
        ).status(),
      ).toBe(200);
      expect(await prisma.toolOutput.findUnique({ where: { id: cascadeId } })).toBeNull();
    } finally {
      for (const context of contexts) await context.dispose();
      await cleanupTestData();
    }
  });

  test('extracts two real PDF pages, keeps follow-up context, restores and removes the file', async ({
    page,
  }) => {
    const labels = en.chat.attachments;
    const submitted: Array<{ conversationId: string; attachmentIds: string[] }> = [];
    await page.route('**/api/chat', async (route) => {
      submitted.push(route.request().postDataJSON());
      await route.fulfill({
        json: { content: 'The observatory opened in **1847** (Observatory.pdf, p. 1).' },
      });
    });
    await page.goto('/en/maestri/manzoni');
    await expect(page.locator('textarea')).toBeVisible();
    const saved = page.waitForResponse(
      (response) =>
        /\/api\/conversations\/[^/]+\/attachments$/.test(response.url()) &&
        response.request().method() === 'POST',
    );
    await page.getByTestId('attachment-file-input').setInputFiles({
      name: 'Observatory.pdf',
      mimeType: 'application/pdf',
      buffer: twoPagePdf(),
    });
    await page.getByRole('button', { name: labels.consent.confirm, exact: true }).click();
    const savedResponse = await saved;
    expect(savedResponse.status()).toBe(201);
    const { attachment } = (await savedResponse.json()) as { attachment: AttachmentDocument };
    expect(attachment.pages).toEqual([
      { pageNumber: 1, text: 'The fictional observatory opened in 1847.' },
      { pageNumber: 2, text: 'The fictional telescope has a violet lens.' },
    ]);
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    for (const question of ['When did it open?', 'What color is its lens?']) {
      await page.locator('textarea').fill(question);
      await page.locator('textarea').press('Enter');
      await expect.poll(() => submitted.length).toBe(question.startsWith('When') ? 1 : 2);
      await expect(page.locator('textarea')).toBeEnabled();
    }
    // The reply's formatting is applied, not shown as asterisks.
    await expect(page.locator('strong', { hasText: '1847' }).first()).toBeVisible();
    await expect(page.getByText('**1847**')).toHaveCount(0);
    expect(submitted[0].attachmentIds).toEqual([attachment.id]);
    expect(submitted[1]).toMatchObject({
      conversationId: submitted[0].conversationId,
      attachmentIds: [attachment.id],
    });
    await page.reload();
    await expect(page.getByText('Observatory.pdf', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: labels.removeLabel.replace('{name}', 'Observatory.pdf') })
      .click();
    await expect(page.getByText('Observatory.pdf', { exact: true })).toHaveCount(0);
    const response = await page.request.get(
      `/api/conversations/${submitted[0].conversationId}/attachments`,
    );
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ attachments: [] });
  });

  test('requires consent before sending an allowed scanned image for OCR', async ({
    page,
    baseURL,
  }) => {
    const prisma = getPrismaClient();
    const { testUserId } = await createE2ETestUser(prisma);
    trackTestRecord('userIds', testUserId);
    const tier = await prisma.tierDefinition.findUniqueOrThrow({ where: { code: 'pro' } });
    await prisma.userSubscription.create({ data: { userId: testUserId, tierId: tier.id } });
    const issued = await issueTestSession(prisma, testUserId);
    await page.context().addCookies(testSessionCookies(issued, baseURL));
    const labels = en.chat.attachments;
    let analyzed = false;
    await page.route('**/api/chat/attachments/analyze', async (route) => {
      analyzed = true;
      expect(route.request().postDataJSON()).toMatchObject({
        image: expect.stringMatching(/^data:image\/png;base64,/),
        pageNumber: 1,
        source: 'image',
      });
      await route.fulfill({ json: { text: 'Synthetic scanned observatory notes.' } });
    });
    await page.goto('/en/maestri/manzoni');
    await expect(page.locator('textarea')).toBeVisible();
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const context = canvas.getContext('2d')!;
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'black';
      context.fillText('Synthetic scanned observatory notes.', 10, 50);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.getByTestId('attachment-file-input').setInputFiles({
      name: 'Scan.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    });
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(analyzed).toBe(false);
    await page.getByRole('button', { name: labels.consent.confirm, exact: true }).click();
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    expect(analyzed).toBe(true);
  });

  for (const locale of ['it', 'en', 'fr', 'de', 'es'] as const) {
    test(`exposes keyboard-accessible attachment controls and consent in ${locale}`, async ({
      page,
    }) => {
      const labels = translations[locale].chat.attachments;
      await page.goto(`/${locale}/maestri/manzoni`);
      await expect(page.locator('textarea')).toBeVisible();
      await expect(page.locator('textarea')).toBeFocused();
      const button = page.getByRole('button', { name: labels.attach, exact: true });
      await button.focus();
      await expect(button).toBeFocused();
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await page.getByTestId('attachment-file-input').setInputFiles({
        name: 'Notes.pdf',
        mimeType: 'application/pdf',
        buffer: twoPagePdf(),
      });
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(
        page.getByRole('button', { name: labels.consent.confirm, exact: true }),
      ).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations,
      ).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });
  }
});
