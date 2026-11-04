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

const translations = { en, it, fr, de, es };

function twoPagePdf(): Buffer {
  const texts = [
    'The fictional observatory opened in 1847.',
    'The fictional telescope has a violet lens.',
  ];
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    '',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  for (const [index, text] of texts.entries()) {
    const stream = `BT /F1 18 Tf 50 700 Td (${text}) Tj ET`;
    objects[index === 0 ? 3 : 5] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(document);
}

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
      expect(
        (await owner.delete(`${path}/${attachment.id}`, { headers: ownerHeaders })).status(),
      ).toBe(204);
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
        json: { content: 'The observatory opened in 1847 (Observatory.pdf, p. 1).' },
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

  test('requires consent before sending a scanned image for OCR', async ({ page }) => {
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
