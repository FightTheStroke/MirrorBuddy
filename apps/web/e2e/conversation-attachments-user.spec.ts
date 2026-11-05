import { test, expect } from './fixtures/base-fixtures';
import type { Page } from '@playwright/test';
import it from '../messages/it/chat.json';
import { textPdf, twoPagePdf } from './helpers/attachment-pdf';
import { MAX_PDF_PAGES } from '../src/lib/pdf/pdf-constants';

const labels = it.chat.attachments;
const attachmentPath = /\/api\/conversations\/[^/]+\/attachments$/;

async function openConversation(page: Page) {
  await page.goto('/it/maestri/manzoni');
  await expect(page.locator('textarea')).toBeVisible();
}

async function choosePdf(page: Page, name: string, buffer: Buffer) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: labels.attach, exact: true }).click();
  await (await chooser).setFiles({ name, mimeType: 'application/pdf', buffer });
}

async function consent(page: Page) {
  await page.getByRole('button', { name: labels.consent.confirm, exact: true }).click();
}

test.describe('PDF attachments as a student uses them', () => {
  test('attaches a 3 MB PDF through the paperclip and preserves its extracted content on reload', async ({
    page,
  }, testInfo) => {
    await openConversation(page);
    const buffer = textPdf(
      ['The observatory access code is VIOLET-1847.', 'The telescope has seven mirrors.'],
      3 * 1024 * 1024,
    );
    expect(buffer.length).toBeGreaterThan(3 * 1024 * 1024);
    const saved = page.waitForResponse(
      (r) => attachmentPath.test(r.url()) && r.request().method() === 'POST',
    );
    await choosePdf(page, 'Appunti di astronomia.pdf', buffer);
    await expect(page.getByRole('dialog')).toBeVisible();
    await consent(page);
    await expect(page.getByText('Appunti di astronomia.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    const response = await saved;
    expect(response.status()).toBe(201);
    const { attachment } = await response.json();
    expect(attachment.size).toBe(buffer.length);
    expect(attachment.pages).toEqual([
      { pageNumber: 1, text: 'The observatory access code is VIOLET-1847.' },
      { pageNumber: 2, text: 'The telescope has seven mirrors.' },
    ]);
    await page.screenshot({ path: testInfo.outputPath('3mb-pdf-ready.png'), fullPage: true });
    await page.reload();
    await expect(page.getByText('Appunti di astronomia.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
  });

  test('shows an actionable error for a multipage handout, not a disappearing document', async ({
    page,
  }) => {
    await openConversation(page);
    await choosePdf(
      page,
      'Dispensa.pdf',
      textPdf(Array.from({ length: MAX_PDF_PAGES + 1 }, (_, i) => `Lesson page ${i + 1}`)),
    );
    await consent(page);
    const item = page.getByRole('listitem').filter({ hasText: 'Dispensa.pdf' });
    await expect(item).toContainText(labels.errors.tooManyPages);
    await expect(
      item.getByRole('button', { name: labels.retryLabel.replace('{name}', 'Dispensa.pdf') }),
    ).toBeVisible();
  });

  test('declining consent sends nothing and the same PDF can be selected again', async ({
    page,
  }) => {
    let saves = 0;
    page.on('request', (request) => {
      if (attachmentPath.test(request.url()) && request.method() === 'POST') saves += 1;
    });
    await openConversation(page);
    await choosePdf(page, 'Notes.pdf', twoPagePdf());
    await page.getByRole('button', { name: labels.consent.decline, exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(saves).toBe(0);
    await expect(page.getByText('Notes.pdf', { exact: true })).toHaveCount(0);
    await choosePdf(page, 'Notes.pdf', twoPagePdf());
    await consent(page);
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    expect(saves).toBe(1);
  });

  test('keeps a failed save visible and retries without selecting the PDF again', async ({
    page,
  }) => {
    let attempts = 0;
    await page.route('**/api/conversations/*/attachments', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts += 1;
      if (attempts === 1) return route.fulfill({ status: 503, json: { code: 'REQUEST_FAILED' } });
      return route.continue();
    });
    await openConversation(page);
    await choosePdf(page, 'Retry.pdf', twoPagePdf());
    await consent(page);
    const item = page.getByRole('listitem').filter({ hasText: 'Retry.pdf' });
    await expect(item).toContainText(labels.errors.generic);
    await item
      .getByRole('button', { name: labels.retryLabel.replace('{name}', 'Retry.pdf') })
      .click();
    await expect(item).toContainText(labels.status.ready);
    expect(attempts).toBe(2);
  });

  test('rejects a corrupt PDF visibly and allows removing it and choosing a valid file', async ({
    page,
  }) => {
    await openConversation(page);
    await choosePdf(page, 'Broken.pdf', Buffer.from('%PDF-1.7\nnot a document'));
    await consent(page);
    const item = page.getByRole('listitem').filter({ hasText: 'Broken.pdf' });
    await expect(item).toContainText(labels.errors.unreadable);
    await item
      .getByRole('button', { name: labels.removeLabel.replace('{name}', 'Broken.pdf') })
      .click();
    await expect(item).toHaveCount(0);
    await choosePdf(page, 'Valid.pdf', twoPagePdf());
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
  });

  test('rejects files larger than 10 MB before saving and keeps the reason visible', async ({
    page,
  }) => {
    await openConversation(page);
    await choosePdf(page, 'Too large.pdf', textPdf(['Large notes'], 10 * 1024 * 1024));
    await consent(page);
    await expect(page.getByRole('listitem').filter({ hasText: 'Too large.pdf' })).toContainText(
      labels.errors.tooLarge,
    );
  });

  test('selects two PDFs together and removes only the chosen document', async ({ page }) => {
    await openConversation(page);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: labels.attach, exact: true }).click();
    await (
      await chooser
    ).setFiles([
      { name: 'First.pdf', mimeType: 'application/pdf', buffer: twoPagePdf() },
      { name: 'Second.pdf', mimeType: 'application/pdf', buffer: textPdf(['Second lesson']) },
    ]);
    await consent(page);
    await expect(page.getByText(labels.status.ready, { exact: true })).toHaveCount(2);
    await page
      .getByRole('button', { name: labels.removeLabel.replace('{name}', 'First.pdf') })
      .click();
    await expect(page.getByText('First.pdf', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Second.pdf', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Second.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText('First.pdf', { exact: true })).toHaveCount(0);
  });
});
